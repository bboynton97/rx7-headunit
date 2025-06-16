use std::error::Error;
use rppal::gpio::Gpio;
use rppal::pwm::{Channel, Polarity, Pwm};

pub struct DisplayBacklight {
    pwm: Pwm,
}

impl DisplayBacklight {
    pub fn new() -> Result<Self, Box<dyn Error>> {
        // SunFounder 7" display typically uses GPIO18 for backlight control
        let pwm = Pwm::with_frequency(
            Channel::Pwm0,  // GPIO18 is on PWM0
            100.0,          // 100 Hz frequency
            0.0,            // Start with 0% duty cycle
            Polarity::Normal,
            true,           // Enable PWM
        )?;

        Ok(DisplayBacklight { pwm })
    }

    pub fn set_brightness(&self, percentage: u8) -> Result<(), Box<dyn Error>> {
        if percentage > 100 {
            return Err("Brightness percentage must be 0-100".into());
        }

        // Convert percentage to duty cycle (0.0 to 1.0)
        let duty_cycle = percentage as f64 / 100.0;
        self.pwm.set_duty_cycle(duty_cycle)?;
        println!("Set PWM duty cycle to {}%", percentage);
        Ok(())
    }
}

#[tauri::command]
pub fn set_brightness(value: u8) -> Result<(), String> {
    println!("Attempting to set brightness to {}", value);
    let backlight = match DisplayBacklight::new() {
        Ok(b) => b,
        Err(e) => {
            println!("Failed to initialize backlight: {}", e);
            return Err(format!("Failed to initialize backlight: {}", e));
        }
    };
    
    match backlight.set_brightness(value) {
        Ok(_) => {
            println!("Successfully set brightness to {}", value);
            Ok(())
        },
        Err(e) => {
            println!("Failed to set brightness: {}", e);
            Err(format!("Failed to set brightness: {}", e))
        }
    }
}