import Link from "next/link";
import SignupForm from "./Form";

export default function SignupPage() {
  return (
    <main style={{ padding: 24, maxWidth: 480 }}>
      <h1>Sign up</h1>
      <p>Email과 비밀번호로 가입합니다.</p>
      <SignupForm />
      <p style={{ marginTop: 16 }}>
        이미 계정이 있으신가요? <Link href="/login">로그인</Link>
      </p>
    </main>
  );
}
