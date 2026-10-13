// tour-config.js
export const GUIDE = {
  chapters: [
    {
      id: "intro",
      title: "導入",
      steps: [
        {
          id: "welcome",
          type: "modal",
          content: {
            title: "ようこそ！マーブリングの世界へ！",
            body: "右上の「終了」を押すと説明を全部見ないで制作に入れます"
          },
          cta: { primary: "はじめる", secondary: "スキップ" },
          advance: { mode: "click-cta" }
        }
      ]
    },
    {
      id: "draw",
      title: "描画",
      steps: [
        {
          id: "pick-color",
          type: "spotlight",
          targets: ["#ctrl-fore-color", "#ctrl-palette"],  
          content: { title: "色を選ぼう", body: "ここで色を選びます。" },
          advance: { mode: "event", name: "color:change", fallbackClickSelector: "#ctrl-fore-color" }
        },
        {
          id: "brush",
          type: "spotlight",
          target: "#ctrl-brush",
          content: { title: "太さを調整", body: "スライダーで線の太さを変えます。" },
          advance: { mode: "next" }
        },
        {
          id: "eraser",
          type: "spotlight",
          target: "#ctrl-eraser",  // ←ここをあなたの消しゴムボタンのIDに合わせて変更
          content: {
            title: "消しゴム",
            body: "消しゴムをONにすると、塗った色を消すことができます。"
          },
          advance: { mode: "next" }
        },
        {
          id: "stroke",
          type: "spotlight",
          targets: ["main#stage canvas", "#ctrl-mode-paint"],
          box: "multi",
          content: { title: "線を描こう", body: "「色を塗る」を選択し、キャンバス上をドラッグすると線を描けます。" },
          advance: { mode: "next" }
        }
      ]
    },
    {
      id: "fluid",
      title: "流体",
      steps: [
        {
          id: "play",
          type: "spotlight",
          targets: ["main#stage canvas", "#ctrl-mode-fluid"],
          box: "multi",
          content: { title: "流してみよう", body: "このボタンを押すと、流体の動きを表現することができます。" },
          advance: { mode: "next" }
        },
//        {
//          id: "splat",
//          type: "spotlight",
//          target: "#ctrl-random-splat",
//          content: { title: "滴を落とす", body: "ランダムに絵の具を落とします。" },
//          advance: { mode: "event", name: "fluid:splat" }
//        }
      ]
    },
    {
      id: "export",
      title: "保存",
      steps: [
        {
          id: "save",
          type: "spotlight",
          target: "#ctrl-save",
          content: { title: "保存しよう", body: "作品を画像ファイルとして保存します。何回でも保存でき、最後に保存した作品がコラージュ制作の背景画になります。" },
          advance: { mode: "event", name: "export:click" }
        },
        {
          id: "done",
          type: "modal",
          target: "#help-btn",
          content: {
            title: "完了！",
            body: "では作品を制作しましょう。左上の「?」からいつでもこのチュートリアルを開けます。"
          },
          cta: { primary: "閉じる" },
          advance: { mode: "click-cta" }
        }
      ]
    }
  ]
};
