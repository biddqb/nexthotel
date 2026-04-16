# Tài liệu hướng dẫn nextHotel

Hệ thống quản lý khách sạn **nextHotel** — tài liệu dành cho người dùng cuối.

## Bạn là ai?

Chọn tài liệu phù hợp với vai trò của bạn:

| Vai trò | Tài liệu | Dung lượng |
|---|---|---|
| **Lễ tân / Buồng phòng** | [Hướng dẫn Lễ tân](./staff.md) | Khoảng 15 phút đọc |
| **Quản lý** | [Hướng dẫn Quản lý](./manager.md) | Khoảng 25 phút đọc |
| **Chủ khách sạn / Giám đốc / IT** | [Hướng dẫn Giám đốc](./director.md) | Khoảng 45 phút đọc (có phần cài đặt) |

## Tài liệu tham khảo

- [Bảng tra cứu nhanh 1 trang](./cheat-sheets.md) — in ra treo cạnh quầy lễ tân
- [Xử lý sự cố](./troubleshooting.md) — khi gặp vấn đề
- [Thuật ngữ](./glossary.md) — từ điển nhanh các thuật ngữ trong app

## Cấu trúc hệ thống (tóm tắt)

```
┌──────────────────────────────────┐
│   Máy chủ (PC của chủ khách sạn) │
│   Luôn bật. Lưu tất cả dữ liệu.  │
└───────┬──────────────────────────┘
        │ Mạng wifi nội bộ
┌───────┴───────┬──────────┬─────────┐
│ PC lễ tân     │ PC QL    │ Máy tính│
│               │          │ bảng    │
└───────────────┴──────────┴─────────┘
```

**Quan trọng:** Máy chủ phải luôn bật. Nếu tắt, tất cả thiết bị khác sẽ mất kết nối
và thấy thông báo đỏ "Mất kết nối đến máy chủ".

## Vai trò và quyền hạn

| Công việc | Lễ tân | Quản lý | Giám đốc |
|---|:-:|:-:|:-:|
| Đặt phòng, nhận/trả phòng, thanh toán | ✓ | ✓ | ✓ |
| Thêm/sửa khách | ✓ | ✓ | ✓ |
| Cập nhật trạng thái phòng | ✓ | ✓ | ✓ |
| Ghi dịch vụ phát sinh | ✓ | ✓ | ✓ |
| Mở / kết ca làm | ✓ | ✓ | ✓ |
| Đánh dấu danh sách đen | | ✓ | ✓ |
| Xoá thanh toán / dịch vụ | | ✓ | ✓ |
| Quản lý phòng, giá mùa vụ | | ✓ | ✓ |
| Chi phí, báo cáo | | ✓ | ✓ |
| Kết sổ cuối ngày, sao lưu | | ✓ | ✓ |
| Chỉnh thông tin khách sạn | | | ✓ |
| Tạo / khoá tài khoản nhân viên | | | ✓ |
| Xem lịch sử hoạt động toàn hệ thống | | | ✓ |

## Mở ứng dụng

1. Mở trình duyệt (Chrome / Edge / Safari).
2. Gõ địa chỉ được quản lý cung cấp, ví dụ: `http://192.168.1.100:8080`
3. Đăng nhập bằng **tên đăng nhập** và **mã PIN** (4–12 chữ số).

Nếu thấy banner đỏ ở trên cùng: "Mất kết nối đến máy chủ" → xem [Xử lý sự cố](./troubleshooting.md).
