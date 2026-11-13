export function TitleField({
  testId,
  value,
  onChange,
}: {
  testId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    // 長いタイトルを折り返して全文見せるために textarea を使う。値は 1 行のまま保つ。
    <textarea
      className="title-field"
      data-testid={testId}
      aria-label="タイトル"
      placeholder="タイトル"
      rows={2}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[\r\n]+/g, ""))}
      onKeyDown={(e) => {
        // WebKit は変換を確定する Enter を isComposing が false の keydown として送るので、keyCode 229 でも見分ける。
        if (
          e.key === "Enter" &&
          !e.nativeEvent.isComposing &&
          e.keyCode !== 229
        )
          e.preventDefault();
      }}
    />
  );
}
