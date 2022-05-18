use rosc::{OscMessage, OscType};

// into / from string;
#[repr(i64)]
enum Parameters {
  Volume = 0,
  Pitch = 1,
  DingDong = 2,
}

trait SobakaModule {
  type Params;
}

trait OscHandler {
    /// '/sobaka/[module_id]/[paramter_id]'
    fn message_name(&self) -> &'static str;

    /// Modules (graph level nodes) can be hit with osc messages
    fn on_message(&mut self, message: OscMessage) -> Result<(), &'static str> {
        if message.addr.as_str() == self.message_name() {
            self.handle_message(message)
        } else {
          Ok(())
        }
    }

    fn handle_message(&mut self, message: OscMessage) -> Result<(), &'static str>;
}

struct Fart {}

impl Fart {
    fn set(&mut self, i: i64, num: f64) {
        todo!()
    }
}

impl OscHandler for Fart {
    fn message_name(&self) -> &'static str { "/sobaka/test" }

    fn handle_message(&mut self, message: OscMessage) -> Result<(), &'static str> {
        // Parameters
        let f: Parameters = todo!();

        match message.args[..] {
            [OscType::Float(num)] => {
                self.set(f as i64, num as f64);
                Ok(())
            }
            _ => Err("No match")
        }
    }
}


