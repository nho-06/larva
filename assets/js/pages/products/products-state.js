export const productState = {
    /*
        Danh sách sản phẩm lấy từ Firebase.
    */
    products: [],

    /*
        Danh sách danh mục lấy từ Firebase.
    */
    categories: [],

    /*
        Chế độ nhập ảnh hiện tại:

        url:
        Dùng đường dẫn ảnh.

        file:
        Chọn ảnh từ thiết bị.

        camera:
        Chụp ảnh bằng camera.
    */
    imageMode: "url",

    /*
        File ảnh người dùng vừa chọn
        hoặc vừa chụp.
    */
    selectedImageFile: null,

    /*
        Đường dẫn tạm thời để xem trước
        ảnh trên trình duyệt.
    */
    localPreviewUrl: "",

    /*
        URL ảnh đã upload lên dịch vụ lưu ảnh.
    */
    uploadedImageUrl: "",

    /*
        Đường dẫn lưu ảnh trên dịch vụ ảnh.

        Giá trị này dùng để quản lý
        hoặc xóa ảnh sau này nếu cần.
    */
    uploadedImagePath: "",

    /*
        Tránh người dùng nhấn lưu sản phẩm
        trong lúc ảnh vẫn đang được upload.
    */
    isUploadingImage: false
};