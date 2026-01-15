{ pkgs, ... }: {
  channel = "stable";

  packages = [
    pkgs.nodejs_20
    # 아이오닉 CLI를 환경에 직접 포함시킵니다.
    pkgs.nodePackages.@ionic/cli
  ];

  idx = {
    extensions = [
      "vue.volar" # Vue를 사용하신다면 필수
      "ionic.ionic" # 아이오닉 공식 확장 프로그램
    ];

    previews = {
      enable = true;
      previews = {
        web = {
          # 아이오닉 서버를 실행하고, 호스트와 포트를 IDX 환경에 맞게 바인딩합니다.
          command = ["ionic" "serve" "--port" "$PORT" "--host" "0.0.0.0" "--no-open"];
          manager = "web";
        };
      };
    };

    workspace = {
      onCreate = {
        # 프로젝트가 처음 구성될 때 의존성을 설치합니다.
        npm-install = "npm install";
      };
    };
  };
}