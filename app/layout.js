import "./globals.css";

export const metadata = {
  title: "WriteCheck TOEIC",
  description: "Chấm & chữa TOEIC Writing theo tiêu chí giám khảo"
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
