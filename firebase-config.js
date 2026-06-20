/* ここにFirebaseの鍵を1回だけ入れる。
   このファイルは index.html を更新しても上書きされないので、ログイン設定が消えません。
   値は Firebaseコンソール →プロジェクトの設定 → マイアプリ(Web) の firebaseConfig からコピー。
   （HSKアプリと同じプロジェクトなら、HSKのindex.html内の同じ値を使えます。）
   設定しなければ自動でローカル保存のみで動作します。 */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCXGj_exdeYVpfxePgo6HHShSQ-ArM4uDQ",
  authDomain: "hsk4-ee5c2.firebaseapp.com",
  projectId: "hsk4-ee5c2",
  appId: "1:1088820844889:web:2aebed464271c02f359448"
};
