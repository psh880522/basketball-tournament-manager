import Link from "next/link";
import LoginForm from "./Form";

export default function LoginPage() {
  return (
    <main style={{ padding: 24, maxWidth: 480 }}>
      <h1>Login</h1>
      <p>Email과 비밀번호로 로그인합니다.</p>
      <LoginForm />
      <p style={{ marginTop: 16 }}>
        계정이 없으신가요? <Link href="/signup">회원가입</Link>
      </p>
    </main>
  );
}
