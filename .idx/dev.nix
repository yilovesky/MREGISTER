{ pkgs, ... }: {
  # 指定 Nix 频道版本
  channel = "stable-24.05";

  # 1. 定义运行所需的软件包
  packages = [
    pkgs.nodejs_22   # 🌟 重点：这里必须改为 22 才能支持 node:sqlite
    pkgs.openssl
    pkgs.chromium
  ];

  # 2. IDX 特定设置
  idx = {
    # 推荐安装的 VS Code 扩展
    extensions = [
      "dsznajder.es7-react-js-snippets"
      "bradlc.vscode-tailwindcss"
    ];

    # 🌟 关键修正：onCreate 和 onStart 必须放在 workspace 下
    workspace = {
      onCreate = {
        # 当工作区第一次创建时运行：自动安装依赖
        npm-install = "npm install";
      };
      onStart = {
        # 每次开启工作区时可以执行的逻辑（可选）
      };
    };

    # 3. 预览配置
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "run" "dev" "--" "--port" "$PORT" "--hostname" "0.0.0.0"];
          manager = "web";
        };
      };
    };
  };
}
