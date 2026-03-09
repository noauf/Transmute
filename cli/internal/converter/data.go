package converter

import (
	"encoding/csv"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"os"
	"strings"

	"github.com/BurntSushi/toml"
	"gopkg.in/yaml.v3"
)

func convertData(inputPath, outputPath, sourceExt, targetFormat string) error {
	// Strategy: parse input into a generic Go structure, then serialize to target format.
	// For tabular data (CSV, TSV) we use [][]string -> []map[string]interface{} (first row = headers).
	// For structured data (JSON, YAML, TOML, XML) we use interface{}.

	raw, err := os.ReadFile(inputPath)
	if err != nil {
		return fmt.Errorf("reading input: %w", err)
	}

	// Determine if source is tabular or structured
	switch sourceExt {
	case "csv", "tsv":
		return convertTabularData(raw, outputPath, sourceExt, targetFormat)
	case "json":
		var data interface{}
		if err := json.Unmarshal(raw, &data); err != nil {
			return fmt.Errorf("parsing JSON: %w", err)
		}
		return writeData(data, outputPath, targetFormat)
	case "ndjson", "jsonl":
		return convertNDJSON(raw, outputPath, targetFormat)
	case "yaml", "yml":
		var data interface{}
		if err := yaml.Unmarshal(raw, &data); err != nil {
			return fmt.Errorf("parsing YAML: %w", err)
		}
		return writeData(data, outputPath, targetFormat)
	case "toml":
		var data interface{}
		if err := toml.Unmarshal(raw, &data); err != nil {
			return fmt.Errorf("parsing TOML: %w", err)
		}
		return writeData(data, outputPath, targetFormat)
	case "xml":
		return convertXML(raw, outputPath, targetFormat)
	case "ini", "env", "properties":
		data := parseKeyValue(string(raw), sourceExt)
		return writeData(data, outputPath, targetFormat)
	case "sql":
		return convertSQL(raw, outputPath, targetFormat)
	default:
		return fmt.Errorf("unsupported data source format: %s", sourceExt)
	}
}

func convertTabularData(raw []byte, outputPath, sourceExt, targetFormat string) error {
	delimiter := ','
	if sourceExt == "tsv" {
		delimiter = '\t'
	}

	reader := csv.NewReader(strings.NewReader(string(raw)))
	reader.Comma = delimiter
	reader.LazyQuotes = true

	records, err := reader.ReadAll()
	if err != nil {
		return fmt.Errorf("parsing %s: %w", sourceExt, err)
	}

	if len(records) == 0 {
		return fmt.Errorf("empty %s file", sourceExt)
	}

	// Convert to []map[string]interface{} using first row as headers
	headers := records[0]
	var rows []map[string]interface{}
	for _, record := range records[1:] {
		row := make(map[string]interface{})
		for i, header := range headers {
			if i < len(record) {
				row[header] = record[i]
			}
		}
		rows = append(rows, row)
	}

	switch targetFormat {
	case "json":
		return writeJSON(rows, outputPath)
	case "yaml", "yml":
		return writeYAML(rows, outputPath)
	case "toml":
		wrapper := map[string]interface{}{"data": rows}
		return writeTOML(wrapper, outputPath)
	case "xml":
		return writeXMLFromRows(rows, outputPath)
	case "tsv":
		return writeDelimited(headers, records[1:], outputPath, '\t')
	case "csv":
		return writeDelimited(headers, records[1:], outputPath, ',')
	case "html":
		return writeHTMLTable(headers, records[1:], outputPath)
	case "sql":
		return writeSQLInserts(headers, records[1:], outputPath, "data")
	case "ndjson":
		return writeNDJSON(rows, outputPath)
	default:
		return fmt.Errorf("unsupported target format for tabular data: %s", targetFormat)
	}
}

func convertNDJSON(raw []byte, outputPath, targetFormat string) error {
	lines := strings.Split(strings.TrimSpace(string(raw)), "\n")
	var items []interface{}
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		var item interface{}
		if err := json.Unmarshal([]byte(line), &item); err != nil {
			continue // skip invalid lines
		}
		items = append(items, item)
	}
	return writeData(items, outputPath, targetFormat)
}

func convertXML(raw []byte, outputPath, targetFormat string) error {
	// Simple XML -> generic map conversion
	var data interface{}
	if err := xml.Unmarshal(raw, &data); err != nil {
		// XML to map is tricky — treat as string content for simple cases
		// or use a simple parser
		data = map[string]interface{}{"xml_content": string(raw)}
	}
	return writeData(data, outputPath, targetFormat)
}

func convertSQL(raw []byte, outputPath, targetFormat string) error {
	// Very basic: extract INSERT statement values
	content := string(raw)
	lines := strings.Split(content, "\n")
	var records []map[string]interface{}

	for _, line := range lines {
		line = strings.TrimSpace(line)
		upper := strings.ToUpper(line)
		if strings.HasPrefix(upper, "INSERT") {
			// Very basic INSERT parser — extract values
			valIdx := strings.Index(upper, "VALUES")
			if valIdx == -1 {
				continue
			}
			valPart := line[valIdx+6:]
			valPart = strings.Trim(valPart, " ;()")
			values := strings.Split(valPart, ",")
			row := make(map[string]interface{})
			for i, v := range values {
				v = strings.TrimSpace(v)
				v = strings.Trim(v, "'\"")
				row[fmt.Sprintf("col%d", i+1)] = v
			}
			records = append(records, row)
		}
	}

	if targetFormat == "json" {
		return writeJSON(records, outputPath)
	}
	if targetFormat == "csv" {
		// Flatten to CSV
		if len(records) == 0 {
			return os.WriteFile(outputPath, []byte(""), 0o644)
		}
		var headers []string
		for k := range records[0] {
			headers = append(headers, k)
		}
		var csvRecords [][]string
		for _, r := range records {
			var row []string
			for _, h := range headers {
				row = append(row, fmt.Sprintf("%v", r[h]))
			}
			csvRecords = append(csvRecords, row)
		}
		return writeDelimited(headers, csvRecords, outputPath, ',')
	}
	return fmt.Errorf("unsupported target format for SQL: %s", targetFormat)
}

func parseKeyValue(content, format string) map[string]interface{} {
	result := make(map[string]interface{})
	lines := strings.Split(content, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, ";") {
			continue
		}
		// Handle different separators
		sep := "="
		if format == "properties" && strings.Contains(line, ":") && !strings.Contains(line, "=") {
			sep = ":"
		}
		parts := strings.SplitN(line, sep, 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			// Remove quotes from .env values
			if format == "env" {
				value = strings.Trim(value, "\"'")
			}
			result[key] = value
		}
	}
	return result
}

// ─── Writers ─────────────────────────────────────────────────

func writeData(data interface{}, outputPath, targetFormat string) error {
	switch targetFormat {
	case "json":
		return writeJSON(data, outputPath)
	case "yaml", "yml":
		return writeYAML(data, outputPath)
	case "toml":
		return writeTOML(data, outputPath)
	case "csv":
		return writeDataAsCSV(data, outputPath)
	case "tsv":
		return writeDataAsTSV(data, outputPath)
	case "xml":
		return writeXMLGeneric(data, outputPath)
	case "html":
		return writeDataAsHTML(data, outputPath)
	case "ndjson":
		return writeDataAsNDJSON(data, outputPath)
	default:
		return fmt.Errorf("unsupported target format: %s", targetFormat)
	}
}

func writeJSON(data interface{}, outputPath string) error {
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(outputPath, b, 0o644)
}

func writeYAML(data interface{}, outputPath string) error {
	b, err := yaml.Marshal(data)
	if err != nil {
		return err
	}
	return os.WriteFile(outputPath, b, 0o644)
}

func writeTOML(data interface{}, outputPath string) error {
	f, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer f.Close()
	enc := toml.NewEncoder(f)
	return enc.Encode(data)
}

func writeDelimited(headers []string, rows [][]string, outputPath string, sep rune) error {
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
		if err := w.Write(row); err != nil {
			return err
		}
	}
	w.Flush()
	return w.Error()
}

func writeHTMLTable(headers []string, rows [][]string, outputPath string) error {
	var sb strings.Builder
	sb.WriteString("<table>\n<thead>\n<tr>")
	for _, h := range headers {
		sb.WriteString("<th>" + h + "</th>")
	}
	sb.WriteString("</tr>\n</thead>\n<tbody>\n")
	for _, row := range rows {
		sb.WriteString("<tr>")
		for _, cell := range row {
			sb.WriteString("<td>" + cell + "</td>")
		}
		sb.WriteString("</tr>\n")
	}
	sb.WriteString("</tbody>\n</table>")
	return os.WriteFile(outputPath, []byte(sb.String()), 0o644)
}

func writeSQLInserts(headers []string, rows [][]string, outputPath, tableName string) error {
	var sb strings.Builder
	cols := strings.Join(headers, ", ")
	for _, row := range rows {
		var vals []string
		for _, v := range row {
			vals = append(vals, "'"+strings.ReplaceAll(v, "'", "''")+"'")
		}
		sb.WriteString(fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s);\n",
			tableName, cols, strings.Join(vals, ", ")))
	}
	return os.WriteFile(outputPath, []byte(sb.String()), 0o644)
}

func writeNDJSON(rows []map[string]interface{}, outputPath string) error {
	var sb strings.Builder
	for _, row := range rows {
		b, err := json.Marshal(row)
		if err != nil {
			return err
		}
		sb.Write(b)
		sb.WriteByte('\n')
	}
	return os.WriteFile(outputPath, []byte(sb.String()), 0o644)
}

func writeXMLFromRows(rows []map[string]interface{}, outputPath string) error {
	var sb strings.Builder
	sb.WriteString("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<data>\n")
	for _, row := range rows {
		sb.WriteString("  <row>\n")
		for k, v := range row {
			sb.WriteString(fmt.Sprintf("    <%s>%v</%s>\n", k, v, k))
		}
		sb.WriteString("  </row>\n")
	}
	sb.WriteString("</data>")
	return os.WriteFile(outputPath, []byte(sb.String()), 0o644)
}

func writeXMLGeneric(data interface{}, outputPath string) error {
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	// Wrap JSON in XML as a simple approach
	content := "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<data>\n" + string(b) + "\n</data>"
	return os.WriteFile(outputPath, []byte(content), 0o644)
}

func writeDataAsCSV(data interface{}, outputPath string) error {
	rows := toRowsOfMaps(data)
	if len(rows) == 0 {
		return os.WriteFile(outputPath, []byte(""), 0o644)
	}
	headers := extractHeaders(rows[0])
	var records [][]string
	for _, row := range rows {
		var record []string
		for _, h := range headers {
			record = append(record, fmt.Sprintf("%v", row[h]))
		}
		records = append(records, record)
	}
	return writeDelimited(headers, records, outputPath, ',')
}

func writeDataAsTSV(data interface{}, outputPath string) error {
	rows := toRowsOfMaps(data)
	if len(rows) == 0 {
		return os.WriteFile(outputPath, []byte(""), 0o644)
	}
	headers := extractHeaders(rows[0])
	var records [][]string
	for _, row := range rows {
		var record []string
		for _, h := range headers {
			record = append(record, fmt.Sprintf("%v", row[h]))
		}
		records = append(records, record)
	}
	return writeDelimited(headers, records, outputPath, '\t')
}

func writeDataAsHTML(data interface{}, outputPath string) error {
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	html := "<html><body><pre>" + string(b) + "</pre></body></html>"
	return os.WriteFile(outputPath, []byte(html), 0o644)
}

func writeDataAsNDJSON(data interface{}, outputPath string) error {
	rows := toRowsOfMaps(data)
	var sb strings.Builder
	for _, row := range rows {
		b, err := json.Marshal(row)
		if err != nil {
			return err
		}
		sb.Write(b)
		sb.WriteByte('\n')
	}
	return os.WriteFile(outputPath, []byte(sb.String()), 0o644)
}

// ─── Helpers ─────────────────────────────────────────────────

func toRowsOfMaps(data interface{}) []map[string]interface{} {
	switch v := data.(type) {
	case []interface{}:
		var rows []map[string]interface{}
		for _, item := range v {
			if m, ok := item.(map[string]interface{}); ok {
				rows = append(rows, m)
			}
		}
		return rows
	case []map[string]interface{}:
		return v
	case map[string]interface{}:
		return []map[string]interface{}{v}
	default:
		return nil
	}
}

func extractHeaders(row map[string]interface{}) []string {
	var headers []string
	for k := range row {
		headers = append(headers, k)
	}
	return headers
}
