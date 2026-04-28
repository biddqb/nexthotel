//! nexthotel-core
//!
//! Pure domain types and logic shared between the desktop binary
//! (`nexthotel-server`) and the future cloud binary. NO I/O, NO database
//! code, NO HTTP-specific impls. Anything that depends on a runtime,
//! a database driver, or a network stack belongs in the binary crates.

pub mod models;
