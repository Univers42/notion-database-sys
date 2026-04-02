use clap::Parser;
use csv::{ReaderBuilder, WriterBuilder};
use std::fs;
use std::io;
use std::path::PathBuf;
use std::process;

/// CLI utility to update a single field in a CSV seed file.
///
/// Reads a CSV file, finds the row where the `id` column matches
/// `--record-id`, sets `--field` to `--value`, and writes back
/// atomically via a temp file + rename.
#[derive(Parser, Debug)]
#[command(author, version, about)]
struct Args {
    /// Path to the CSV seed file
    #[arg(long)]
    file: PathBuf,

    /// The `id` value of the record to update
    #[arg(long)]
    record_id: String,

    /// The column name to set
    #[arg(long)]
    field: String,

    /// The new value (plain string)
    #[arg(long)]
    value: String,
}

fn run(args: &Args) -> Result<(), String> {
    let content = fs::read_to_string(&args.file)
        .map_err(|e| format!("Failed to read {}: {e}", args.file.display()))?;

    let mut reader = ReaderBuilder::new()
        .has_headers(true)
        .from_reader(content.as_bytes());

    let headers: Vec<String> = reader
        .headers()
        .map_err(|e| format!("Failed to read CSV headers: {e}"))?
        .iter()
        .map(String::from)
        .collect();

    if !headers.contains(&args.field) {
        return Err(format!("Column '{}' not found in CSV headers", args.field));
    }

    let id_col = headers
        .iter()
        .position(|h| h == "id")
        .ok_or_else(|| "CSV has no 'id' column".to_string())?;

    let field_col = headers
        .iter()
        .position(|h| h == &args.field)
        .ok_or_else(|| format!("Column '{}' not found", args.field))?;

    let mut rows: Vec<Vec<String>> = Vec::new();
    let mut found = false;

    for result in reader.records() {
        let record = result.map_err(|e| format!("Failed to read CSV row: {e}"))?;
        let mut row: Vec<String> = record.iter().map(String::from).collect();

        if row.get(id_col).map(String::as_str) == Some(&args.record_id) {
            if let Some(cell) = row.get_mut(field_col) {
                *cell = args.value.clone();
            }
            found = true;
        }

        rows.push(row);
    }

    if !found {
        return Err(format!("Record with id '{}' not found", args.record_id));
    }

    let mut output = Vec::new();
    {
        let mut writer = WriterBuilder::new().from_writer(&mut output);
        writer
            .write_record(&headers)
            .map_err(|e| format!("Failed to write CSV header: {e}"))?;
        for row in &rows {
            writer
                .write_record(row)
                .map_err(|e| format!("Failed to write CSV row: {e}"))?;
        }
        writer
            .flush()
            .map_err(|e| format!("Failed to flush CSV: {e}"))?;
    }

    atomic_write(&args.file, &output)
        .map_err(|e| format!("Failed to write {}: {e}", args.file.display()))?;

    eprintln!(
        "✔ Updated record '{}' field '{}' in {}",
        args.record_id,
        args.field,
        args.file.display()
    );
    Ok(())
}

/// Write to a temp file in the same directory, then rename for atomicity.
fn atomic_write(target: &PathBuf, data: &[u8]) -> io::Result<()> {
    let dir = target.parent().unwrap_or(target);
    let tmp = dir.join(format!(
        ".{}.tmp",
        target.file_name().unwrap().to_string_lossy()
    ));
    fs::write(&tmp, data)?;
    fs::rename(&tmp, target)?;
    Ok(())
}

fn main() {
    let args = Args::parse();
    if let Err(e) = run(&args) {
        eprintln!("Error: {e}");
        process::exit(1);
    }
}
