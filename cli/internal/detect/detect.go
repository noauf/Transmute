package detect

// FileCategory represents the type of file
type FileCategory string

const (
	CategoryImage       FileCategory = "image"
	CategoryDocument    FileCategory = "document"
	CategoryAudio       FileCategory = "audio"
	CategoryVideo       FileCategory = "video"
	CategoryData        FileCategory = "data"
	CategoryFont        FileCategory = "font"
	CategorySpreadsheet FileCategory = "spreadsheet"
	CategoryUnknown     FileCategory = "unknown"
)

// extensionMap maps file extensions to categories
var extensionMap = map[string]FileCategory{
	// Images
	"png": CategoryImage, "jpg": CategoryImage, "jpeg": CategoryImage,
	"webp": CategoryImage, "gif": CategoryImage, "bmp": CategoryImage,
	"tiff": CategoryImage, "tif": CategoryImage, "avif": CategoryImage,
	"svg": CategoryImage, "ico": CategoryImage,
	"heic": CategoryImage, "heif": CategoryImage,
	"psd": CategoryImage,

	// Documents
	"pdf": CategoryDocument, "docx": CategoryDocument, "txt": CategoryDocument,
	"md": CategoryDocument, "html": CategoryDocument, "htm": CategoryDocument,
	"rtf": CategoryDocument, "epub": CategoryDocument, "pptx": CategoryDocument,

	// Audio
	"mp3": CategoryAudio, "wav": CategoryAudio, "flac": CategoryAudio,
	"ogg": CategoryAudio, "aac": CategoryAudio, "m4a": CategoryAudio,
	"wma": CategoryAudio, "opus": CategoryAudio,

	// Video
	"mp4": CategoryVideo, "webm": CategoryVideo, "avi": CategoryVideo,
	"mov": CategoryVideo, "mkv": CategoryVideo, "flv": CategoryVideo,
	"wmv": CategoryVideo, "m4v": CategoryVideo,

	// Data
	"csv": CategoryData, "json": CategoryData, "xml": CategoryData,
	"yaml": CategoryData, "yml": CategoryData, "tsv": CategoryData,
	"toml": CategoryData,
	"ini":  CategoryData, "env": CategoryData, "properties": CategoryData,
	"ndjson": CategoryData, "jsonl": CategoryData, "sql": CategoryData,

	// Spreadsheets
	"xlsx": CategorySpreadsheet, "xls": CategorySpreadsheet, "ods": CategorySpreadsheet,

	// Fonts
	"ttf": CategoryFont, "otf": CategoryFont, "woff": CategoryFont, "woff2": CategoryFont,
}

// conversionMap maps each extension to its available target formats
// This matches the web app's conversion map exactly.
var conversionMap = map[string][]string{
	// ─── Images ──────────────────────────────────────────────
	"png":  {"jpg", "webp", "gif", "bmp", "avif", "tiff", "ico"},
	"jpg":  {"png", "webp", "gif", "bmp", "avif", "tiff", "ico"},
	"jpeg": {"png", "webp", "gif", "bmp", "avif", "tiff", "ico"},
	"webp": {"png", "jpg", "gif", "bmp", "avif", "tiff", "ico"},
	"gif":  {"png", "jpg", "webp", "bmp", "avif", "tiff"},
	"bmp":  {"png", "jpg", "webp", "gif", "avif", "tiff"},
	"tiff": {"png", "jpg", "webp", "gif", "bmp", "avif"},
	"tif":  {"png", "jpg", "webp", "gif", "bmp", "avif"},
	"avif": {"png", "jpg", "webp", "gif", "bmp", "tiff"},
	"svg":  {"png", "jpg", "webp", "gif", "bmp", "avif", "tiff"},
	"ico":  {"png", "jpg", "webp", "gif", "bmp"},
	"heic": {"png", "jpg", "webp", "gif", "bmp", "avif", "tiff"},
	"heif": {"png", "jpg", "webp", "gif", "bmp", "avif", "tiff"},
	"psd":  {"png", "jpg", "webp", "gif", "bmp", "avif", "tiff", "ico"},

	// ─── Documents ───────────────────────────────────────────
	"pdf":  {"txt", "html", "md", "docx", "epub"},
	"docx": {"pdf", "html", "txt", "md", "epub"},
	"md":   {"html", "pdf", "txt", "docx", "epub", "pptx"},
	"html": {"pdf", "txt", "md", "docx", "epub", "pptx"},
	"htm":  {"pdf", "txt", "md", "docx", "epub", "pptx"},
	"txt":  {"pdf", "html", "md", "docx", "epub", "pptx"},
	"rtf":  {"txt", "html", "md", "pdf", "docx"},
	"epub": {"txt", "html", "md", "pdf"},
	"pptx": {"txt", "html", "pdf", "md"},

	// ─── Audio ───────────────────────────────────────────────
	"mp3":  {"wav", "ogg", "aac", "flac", "m4a", "opus"},
	"wav":  {"mp3", "ogg", "aac", "flac", "m4a", "opus"},
	"flac": {"mp3", "wav", "ogg", "aac", "m4a", "opus"},
	"ogg":  {"mp3", "wav", "aac", "flac", "m4a", "opus"},
	"aac":  {"mp3", "wav", "ogg", "flac", "m4a", "opus"},
	"m4a":  {"mp3", "wav", "ogg", "flac", "aac", "opus"},
	"wma":  {"mp3", "wav", "ogg", "flac", "aac", "m4a"},
	"opus": {"mp3", "wav", "ogg", "flac", "aac", "m4a"},

	// ─── Video ───────────────────────────────────────────────
	"mp4":  {"webm", "avi", "mov", "mkv", "gif", "mp3", "wav", "ogg", "aac", "flac"},
	"webm": {"mp4", "avi", "mov", "mkv", "gif", "mp3", "wav", "ogg", "aac", "flac"},
	"avi":  {"mp4", "webm", "mov", "mkv", "gif", "mp3", "wav", "ogg", "aac", "flac"},
	"mov":  {"mp4", "webm", "avi", "mkv", "gif", "mp3", "wav", "ogg", "aac", "flac"},
	"mkv":  {"mp4", "webm", "avi", "mov", "gif", "mp3", "wav", "ogg", "aac", "flac"},
	"flv":  {"mp4", "webm", "avi", "mov", "mkv", "gif", "mp3", "wav", "ogg", "aac", "flac"},
	"wmv":  {"mp4", "webm", "avi", "mov", "mkv", "gif", "mp3", "wav", "ogg", "aac", "flac"},
	"m4v":  {"mp4", "webm", "avi", "mov", "mkv", "gif", "mp3", "wav", "ogg", "aac", "flac"},

	// ─── Data ────────────────────────────────────────────────
	"csv":        {"json", "xml", "yaml", "tsv", "toml", "xlsx", "ini", "env", "properties", "ndjson", "sql"},
	"json":       {"csv", "xml", "yaml", "tsv", "toml", "xlsx", "ini", "env", "properties", "ndjson", "sql"},
	"xml":        {"json", "csv", "yaml", "tsv", "toml", "xlsx"},
	"yaml":       {"json", "csv", "xml", "tsv", "toml", "xlsx", "ini", "env", "properties", "ndjson", "sql"},
	"yml":        {"json", "csv", "xml", "tsv", "toml", "xlsx", "ini", "env", "properties", "ndjson", "sql"},
	"tsv":        {"csv", "json", "xml", "yaml", "toml", "xlsx", "ndjson", "sql"},
	"toml":       {"json", "csv", "xml", "yaml", "tsv", "xlsx"},
	"ini":        {"json", "yaml", "toml", "env", "properties", "xml", "csv"},
	"env":        {"json", "yaml", "toml", "ini", "properties", "csv"},
	"properties": {"json", "yaml", "toml", "ini", "env", "csv"},
	"ndjson":     {"json", "csv", "tsv", "yaml", "xml", "xlsx", "sql"},
	"jsonl":      {"json", "csv", "tsv", "yaml", "xml", "xlsx", "sql"},
	"sql":        {"json", "csv", "tsv", "yaml", "xlsx"},

	// ─── Spreadsheets ────────────────────────────────────────
	"xlsx": {"csv", "json", "tsv", "xml", "yaml", "toml", "ods", "html", "txt", "ndjson", "sql"},
	"xls":  {"xlsx", "csv", "json", "tsv", "xml", "yaml", "toml", "ods", "html", "txt", "ndjson", "sql"},
	"ods":  {"xlsx", "csv", "json", "tsv", "xml", "yaml", "toml", "html", "txt", "ndjson", "sql"},

	// ─── Fonts ───────────────────────────────────────────────
	"ttf":   {"otf", "woff", "woff2"},
	"otf":   {"ttf", "woff", "woff2"},
	"woff":  {"ttf", "otf", "woff2"},
	"woff2": {"ttf", "otf", "woff"},
}

// defaultTargets maps extensions to their preferred default target.
// Matches web app defaults exactly.
var defaultTargets = map[string]string{
	// Images -> WebP (modern, smaller)
	"png": "webp", "jpg": "webp", "jpeg": "webp", "gif": "webp",
	"bmp": "png", "tiff": "png", "tif": "png", "avif": "png", "svg": "png", "ico": "png",
	"heic": "jpg", "heif": "jpg", "psd": "png",
	// Documents -> PDF (except PDF -> DOCX)
	"docx": "pdf", "md": "html", "html": "pdf", "htm": "pdf", "txt": "pdf",
	"pdf": "docx", "rtf": "docx", "epub": "html", "pptx": "pdf",
	// Audio -> MP3
	"wav": "mp3", "flac": "mp3", "ogg": "mp3", "aac": "mp3", "m4a": "mp3",
	"wma": "mp3", "opus": "mp3", "mp3": "wav",
	// Video -> MP4
	"avi": "mp4", "mov": "mp4", "mkv": "mp4", "flv": "mp4", "wmv": "mp4",
	"m4v": "mp4", "mp4": "webm", "webm": "mp4",
	// Data -> JSON
	"csv": "json", "xml": "json", "yaml": "json", "yml": "json", "tsv": "csv",
	"json": "csv", "toml": "json",
	"ini": "json", "env": "json", "properties": "json",
	"ndjson": "json", "jsonl": "json", "sql": "json",
	// Spreadsheets -> CSV
	"xlsx": "csv", "xls": "csv", "ods": "csv",
	// Fonts -> WOFF2 (modern web standard)
	"ttf": "woff2", "otf": "woff2", "woff": "woff2", "woff2": "ttf",
}

// DetectCategory returns the category for a given file extension
func DetectCategory(ext string) FileCategory {
	if cat, ok := extensionMap[ext]; ok {
		return cat
	}
	return CategoryUnknown
}

// GetAvailableFormats returns the conversion targets for a given extension
func GetAvailableFormats(ext string) []string {
	if fmts, ok := conversionMap[ext]; ok {
		return fmts
	}
	return nil
}

// GetDefaultTarget returns the preferred default target format for an extension.
func GetDefaultTarget(ext string) string {
	if def, ok := defaultTargets[ext]; ok {
		return def
	}
	fmts := GetAvailableFormats(ext)
	if len(fmts) > 0 {
		return fmts[0]
	}
	return ""
}

// IsSupported returns true if the extension is known
func IsSupported(ext string) bool {
	_, ok := extensionMap[ext]
	return ok
}

// CategoryLabel returns a human-readable label
func CategoryLabel(cat FileCategory) string {
	switch cat {
	case CategoryImage:
		return "Image"
	case CategoryDocument:
		return "Document"
	case CategoryAudio:
		return "Audio"
	case CategoryVideo:
		return "Video"
	case CategoryData:
		return "Data"
	case CategoryFont:
		return "Font"
	case CategorySpreadsheet:
		return "Spreadsheet"
	default:
		return "Unknown"
	}
}

// CategoryIcon returns a unicode icon for the category
func CategoryIcon(cat FileCategory) string {
	switch cat {
	case CategoryImage:
		return "\U0001f5bc" // framed picture
	case CategoryDocument:
		return "\U0001f4c4" // page facing up
	case CategoryAudio:
		return "\U0001f3b5" // musical note
	case CategoryVideo:
		return "\U0001f3ac" // clapper board
	case CategoryData:
		return "\U0001f4ca" // bar chart
	case CategoryFont:
		return "\U0001f524" // input latin letters
	case CategorySpreadsheet:
		return "\U0001f4cb" // clipboard
	default:
		return "\U0001f4c1" // file folder
	}
}
