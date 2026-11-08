import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl py-12 text-center">
      <h1 className="text-2xl font-bold">없는 화면이에요</h1>
      <p className="mt-2 text-ink-soft">주소를 다시 확인하거나 처음 화면으로 돌아가 주세요.</p>
      <LinkButton href="/" className="mt-6">
        처음으로
      </LinkButton>
    </div>
  );
}
