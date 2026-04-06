{ pkgs, ... }: {
  # 指定 Nix 频道版本
  channel = "stable-24.05";

  # 1. 定义运行所需的软件包
  packages = [
    pkgs.nodejs_20
    pkgs.openssl       # 某些 Node.js 库（如 Prisma/SQLite）可能需要
    pkgs.chromium      # 虽然我们改用 IMAP 读信，但注册时的自动化可能仍需要浏览器驱动
  ];

  # 2. IDX 特定设置
  idx = {
    # 推荐安装的 VS Code 扩展（让你写代码更顺手）
    extensions = [
      "dsznajder.es7-react-js-snippets"
      "bradlc.vscode-tailwindcss"
    ];

    # 3. 预览配置：当环境启动时，自动运行开发服务器
    previews = {
      enable = true;
      previews = {
        web = {
          # 使用 $PORT 环境变量以适配 Google Cloud 映射
          command = ["npm" "run" "dev" "--" "--port" "$PORT" "--hostname" "0.0.0.0"];
          manager = "web";
        };
      };
    };

    # 4. 工作区生命周期钩子
    onCreate = {
      # 当工作区第一次创建时运行：自动安装依赖
      npm-install = "npm install";
    };
    
    onStart = {
      # 每次工作区重新启动时运行（可选）
      # watch-node-modules = "npm install"; 
    };
  };
}
