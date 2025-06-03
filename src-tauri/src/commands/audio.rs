use std::io::BufReader;
use rodio::PlayError::DecoderError;

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