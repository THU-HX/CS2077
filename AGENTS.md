# CS:2077 开发与发布

- 游戏改动以 `CS2077.html` 为准。运行 `node scripts/sync-source.mjs` 导出拆分版，再用 `node scripts/sync-source.mjs --check` 核对。
- 按维护者要求，完成并验证游戏改动后，将本次相关文件提交、推送到 `THU-HX/CS2077` 的 `main`，随后通过现有 Cloudflare Workers 项目 `cs2077` 发布同一份 HTML 到 [试玩站](https://cs2077.must-xin.com/)。
- 通过远端提交号和试玩站返回的游戏内容核对发布结果。如果其中一步失败，说明 GitHub 和试玩站各自的实际状态。
