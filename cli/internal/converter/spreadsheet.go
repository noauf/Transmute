package converter

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/xuri/excelize/v2"
	"gopkg.in/yaml.v3"
)

func convertSpreadsheet(inputPath, outputPath, sourceExt, targetFormat string) error {
	// Read spreadsheet using excelize (supports xlsx, xls via xlsx conversion)
	f, err := excelize.OpenFile(inputPath)
	if err != nil {
		return fmt.Errorf("opening spreadsheet: %w", err)
	}
	defer f.Close()

	// Get first sheet
	sheetName := f.GetSheetName(0)
	if sheetName == "" {
		return fmt.Errorf("no sheets found in spreadsheet")
	}

	rows, err := f.GetRows(sheetName)
	if err != nil {
		return fmt.Errorf("reading rows: %w", err)
	}

	if len(rows) == 0 {
		return fmt.Errorf("spreadsheet is empty")
	}

	headers := rows[0]
	dataRows := rows[1:]

	switch targetFormat {
	case "csv":
		return writeSpreadsheetDelimited(headers, dataRows, outputPath, ',')
	case "tsv":
		return writeSpreadsheetDelimited(headers, dataRows, outputPath, '\t')
	case "json":
		return writeSpreadsheetJSON(headers, dataRows, outputPath)
	case "yaml", "yml":
		return writeSpreadsheetYAML(headers, dataRows, outputPath)
	case "xml":
		return writeSpreadsheetXML(headers, dataRows, outputPath)
	case "html":
		return writeSpreadsheetHTML(headers, dataRows, outputPath)
	default:
		return fmt.Errorf("unsupported target for spreadsheet: %s", targetFormat)
	}
}

func writeSpreadsheetDelimited(headers []string, rows [][]string, outputPath string, sep rune) error {
	f, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer f.Close()

	w := csv.NewWriter(f)
	w.Comma = sep
	if err := w.Write(headers); err != nil {
		return err
	}
	for _, row := range rows {
		// Pad row to match header length
		for len(row) < len(headers) {
			row = append(row, "")
		}
		if err := w.Write(row[:len(headers)]); err != nil {
			return err
		}
	}
	w.Flush()
	return w.Error()
}

func writeSpreadsheetJSON(headers []string, rows [][]string, outputPath string) error {
	var records []map[string]string
	for _, row := range rows {
		record := make(map[string]string)
		for i, h := range headers {
			if i < len(row) {
				record[h] = row[i]
			} else {
				record[h] = ""
			}
		}
		records = append(records, record)
	}
	b, err := json.MarshalIndent(records, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(outputPath, b, 0o644)
}

func writeSpreadsheetYAML(headers []string, rows [][]string, outputPath string) error {
	var records []map[string]string
	for _, row := range rows {
		record := make(map[string]string)
		for i, h := range headers {
			if i < len(row) {
				record[h] = row[i]
			} else {
				record[h] = ""
			}
		}
		records = append(records, record)
	}
	b, err := yaml.Marshal(records)
	if err != nil {
		return err
	}
	return os.WriteFile(outputPath, b, 0o644)
}

func writeSpreadsheetXML(headers []string, rows [][]string, outputPath string) error {
	var sb strings.Builder
	sb.WriteString("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<spreadsheet>\n")
	for _, row := range rows {
		sb.WriteString("  <row>\n")
		for i, h := range headers {
			val := ""
			if i < len(row) {
				val = row[i]
			}
			sb.WriteString(fmt.Sprintf("    <%s>%s</%s>\n", h, val, h))
		}
		sb.WriteString("  </row>\n")
	}
	sb.WriteString("</spreadsheet>")
	return os.WriteFile(outputPath, []byte(sb.String()), 0o644)
}

func writeSpreadsheetHTML(headers []string, rows [][]string, outputPath string) error {
	var sb strings.Builder
	sb.WriteString("<html><body>\n<table border=\"1\">\n<thead>\n<tr>")
	for _, h := range headers {
		sb.WriteString("<th>" + h + "</th>")
	}
	sb.WriteString("</tr>\n</thead>\n<tbody>\n")
	for _, row := range rows {
		sb.WriteString("<tr>")
		for i := range headers {
			val := ""
			if i < len(row) {
				val = row[i]
			}
			sb.WriteString("<td>" + val + "</td>")
		}
		sb.WriteString("</tr>\n")
	}
	sb.WriteString("</tbody>\n</table>\n</body></html>")
	return os.WriteFile(outputPath, []byte(sb.String()), 0o644)
}
