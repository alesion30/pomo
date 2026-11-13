import { browser } from "@wdio/globals";

// 埋め込みの WebDriver では selectByVisibleText で option を選べないので、
// 利用者がメニューで選んだ時と同じく、値を変えて change を送る。
export async function selectOption(testId: string, text: string) {
  await browser.execute(
    (id, label) => {
      const select = document.querySelector<HTMLSelectElement>(
        `[data-testid="${id}"]`,
      );
      const option = Array.from(select?.options ?? []).find(
        (o) => o.text === label,
      );
      if (!select || !option) throw new Error(`no option ${label} in ${id}`);
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    },
    testId,
    text,
  );
}
