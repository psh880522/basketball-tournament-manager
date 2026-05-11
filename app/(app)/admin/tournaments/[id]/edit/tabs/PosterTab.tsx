"use client";

import { useRef, useState, useTransition } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { uploadPosterAction, deletePosterAction } from "../actions";

type PosterTabProps = {
  tournamentId: string;
  initialPosterUrl: string | null;
};

export default function PosterTab({ tournamentId, initialPosterUrl }: PosterTabProps) {
  const [posterUrl, setPosterUrl] = useState<string | null>(initialPosterUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError(null);
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append("poster", selectedFile);

    startTransition(async () => {
      const result = await uploadPosterAction(tournamentId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPosterUrl(result.posterUrl);
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  const handleDelete = () => setShowConfirm(true);

  const doDelete = () => {
    setShowConfirm(false);
    startTransition(async () => {
      const result = await deletePosterAction(tournamentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPosterUrl(null);
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  const displayUrl = preview ?? posterUrl;

  return (
    <Card className="space-y-4">
      {showConfirm && (
        <ConfirmModal
          message="포스터를 삭제하시겠습니까?"
          onConfirm={doDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <h2 className="text-lg font-semibold">포스터</h2>

      {displayUrl ? (
        <div className="relative mx-auto w-full max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt="대회 포스터"
            className="w-full rounded-md border border-gray-200 object-cover"
          />
        </div>
      ) : (
        <div className="mx-auto flex h-40 w-full max-w-xs items-center justify-center rounded-md border border-dashed border-gray-300 text-sm text-gray-400">
          포스터 없음
        </div>
      )}

      <div className="flex justify-center flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
        >
          이미지 선택
        </Button>
        {selectedFile && (
          <Button type="button" onClick={handleUpload} disabled={isPending}>
            {isPending ? "업로드 중..." : "업로드"}
          </Button>
        )}
        {posterUrl && !selectedFile && (
          <Button
            type="button"
            variant="ghost"
            className="text-red-600 hover:text-red-700"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "삭제 중..." : "포스터 삭제"}
          </Button>
        )}
      </div>

      {selectedFile && (
        <p className="text-xs text-gray-500">선택된 파일: {selectedFile.name}</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </Card>
  );
}
