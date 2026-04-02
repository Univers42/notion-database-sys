use clap::Parser;
use serde_json::Value;
use std::fs;
use std::io;
use std::path::PathBuf;
use std::process;

/// CLI utility to update a single field in a JSON seed file.
///
/// Reads a JSON array file, finds the record matching `--record-id`,
/// sets `--field` to `--value`, and writes back atomically via
/// a temp file + rename.
#[derive(Parser, Debug)]
#[command(author, version, about)]
struct Args {
    /// Path to the JSON seed file (array of objects)
    #[arg(long)]
    file: PathBuf,

    /// The `id` value of the record to update
    #[arg(long)]
    record_id: String,

    /// The field name to set
    #[arg(long)]
    field: String,

    /// The new value (parsed as JSON; strings must be quoted)
    #[arg(long)]
    value: String,
}

fn run(args: &Args) -> Result<(), String> {
    let content = fs::read_to_string(&args.file)
        .map_err(|e| format!("Failed to read {}: {e}", args.file.display()))?;

    let mut records: Vec<Value> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse JSON: {e}"))?;

    let new_value: Value = serde_json::from_str(&args.value)
        .unwrap_or_else(|_| Value::String(args.value.clone()));

    let record = records
        .iter_mut()
        .find(|r| r.get("id").and_then(Value::as_str) == Some(&args.record_id))
        .ok_or_else(|| format!("Record with id '{}' not found", args.record_id))?;

    if let Some(obj) = record.as_object_mut() {
        obj.insert(args.field.clone(), new_value);
    } else {
        return Err("Record is not a JSON object".to_string());
    }

    let output = serde_json::to_string_pretty(&records)
        .map_err(|e| format!("Failed to serialize JSON: {e}"))?;

    atomic_write(&args.file, output.as_bytes())
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
    let tmp = dir.join(format!(".{}.tmp", target.file_name().unwrap().to_string_lossy()));
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
