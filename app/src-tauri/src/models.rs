use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Hotel {
    pub id: i64,
    pub name: String,
    pub address: String,
    pub tax_id: String,
    pub phone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Room {
    pub id: i64,
    pub hotel_id: i64,
    pub room_number: String,
    pub room_type: String,
    pub base_rate: i64,
    pub active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Guest {
    pub id: i64,
    pub hotel_id: i64,
    pub name: String,
    pub phone: String,
    pub id_number: String,
    pub nationality: String,
    pub notes: String,
    pub is_blacklisted: bool,
    pub blacklist_reason: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reservation {
    pub id: i64,
    pub hotel_id: i64,
    pub room_id: i64,
    pub guest_id: i64,
    pub check_in: String,
    pub check_out: String,
    pub status: String,
    pub payment_status: String,
    pub rate: i64,
    pub total: i64,
    pub deposit: i64,
    pub notes: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReservationWithDetails {
    #[serde(flatten)]
    pub reservation: Reservation,
    pub guest_name: String,
    pub guest_phone: String,
    pub room_number: String,
    pub room_type: String,
    pub paid_amount: i64,
    pub nights: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub id: i64,
    pub hotel_id: i64,
    pub reservation_id: i64,
    pub amount: i64,
    pub method: String,
    pub paid_at: String,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RatePlan {
    pub id: i64,
    pub hotel_id: i64,
    pub name: String,
    pub starts_on: String,
    pub ends_on: String,
    pub applies_to_room_type: Option<String>,
    pub rate: i64,
    pub priority: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub data_dir: String,
    pub first_run_complete: bool,
    pub locale: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            data_dir: String::new(),
            first_run_complete: false,
            locale: "vi".into(),
        }
    }
}

// ---------- Auth ----------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Staff,
    Manager,
    Director,
}

impl Role {
    pub fn as_str(&self) -> &'static str {
        match self {
            Role::Staff => "staff",
            Role::Manager => "manager",
            Role::Director => "director",
        }
    }
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "staff" => Some(Role::Staff),
            "manager" => Some(Role::Manager),
            "director" => Some(Role::Director),
            _ => None,
        }
    }
    /// Ordering: director > manager > staff.
    pub fn rank(&self) -> i32 {
        match self {
            Role::Staff => 1,
            Role::Manager => 2,
            Role::Director => 3,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct User {
    pub id: i64,
    pub name: String,
    pub role: Role,
    pub active: bool,
    pub created_at: String,
}
