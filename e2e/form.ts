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

// React は value の直接の代入を入力として扱わないので、ネイティブの setter で値を入れて input を送る。
// 埋め込みの WebDriver では time 入力に setValue で時刻を打てないため。
export async function setInput(testId: string, value: string) {
  await browser.execute(
    (id, next) => {
      const input = document.querySelector<HTMLInputElement>(
        `[data-testid="${id}"]`,
      );
      if (!input) throw new Error(`no input ${id}`);
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(input, next);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    },
    testId,
    value,
  );
}
