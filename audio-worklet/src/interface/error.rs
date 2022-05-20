use std::fmt;

#[derive(Debug, Clone, PartialEq)]
pub enum SobakaError {
    Something,
}

impl fmt::Display for SobakaError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            SobakaError::Something => write!(f, "invalid target"),
        }
    }
}
