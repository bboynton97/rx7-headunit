use std::io::BufReader;
use rodio::PlayError::DecoderError;
use std::process::Command;

#[tauri::command]
pub fn play_synth() {
    let (_stream, handle) = rodio::OutputStream::try_default().unwrap();
    let sink = rodio::Sink::try_new(&handle).unwrap();

    let file = std::fs::File::open("assets/intro_synthwave.wav").unwrap();
    
    let decoder = rodio::Decoder::new(BufReader::new(file));
    if let Ok(decoder) = decoder {
        sink.append(decoder);
        sink.sleep_until_end();
    } else if let Err(e) = decoder {
        println!("Error opening file: {e}");
    }
}

#[tauri::command]
pub fn set_system_volume(volume: u8) -> Result<(), String> {
    if volume > 100 {
        return Err("Volume must be between 0 and 100".to_string());
    }

    let output = Command::new("amixer")
        .args(["set", "Master", &format!("{}%", volume)])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        println!("Error setting volume: {}", String::from_utf8_lossy(&output.stderr));
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}