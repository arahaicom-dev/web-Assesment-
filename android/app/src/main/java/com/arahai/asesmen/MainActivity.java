package com.arahai.asesmen;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Asesmen Merdeka untuk Android: membuka website Asesmen Merdeka dalam layar penuh,
 * lengkap dengan unggah berkas/foto, kamera & mikrofon, unduh Excel/PDF, dan cetak.
 */
public class MainActivity extends Activity {
    private static final int REQ_FILE = 11;
    private static final int REQ_PERM = 12;
    private static final int REQ_STORAGE = 13;

    private WebView web;
    private ProgressBar bar;
    private View offline;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingPerm;
    private String home;
    private String host;
    private String pendingSaveName, pendingSaveMime;
    private byte[] pendingSaveData;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        home = BuildConfig.APP_URL;
        host = Uri.parse(home).getHost();
        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor("#16125a"));
        w.setNavigationBarColor(Color.parseColor("#120f45"));

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#120f45"));
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        bar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        bar.setMax(100);
        bar.setProgressTintList(android.content.res.ColorStateList.valueOf(Color.parseColor("#8b7bff")));
        root.addView(bar, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(3)));
        offline = getLayoutInflater().inflate(R.layout.offline, root, false);
        offline.setVisibility(View.GONE);
        offline.findViewById(R.id.retry).setOnClickListener(v -> { offline.setVisibility(View.GONE); web.reload(); });
        root.addView(offline);
        setContentView(root);

        setupWeb();
        if (state != null) web.restoreState(state);
        else {
            Uri data = getIntent() != null ? getIntent().getData() : null;
            web.loadUrl(data != null && isOwn(data) ? data.toString() : home);
        }
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private boolean isOwn(Uri u) {
        String h = u.getHost();
        return h != null && (h.equalsIgnoreCase(host) || h.equalsIgnoreCase("www." + host) || ("www." + h).equalsIgnoreCase(host));
    }

    private void setupWeb() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setSupportMultipleWindows(false);
        s.setUserAgentString(s.getUserAgentString() + " AsesmenMerdekaApp/" + BuildConfig.VERSION_NAME);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setBackgroundColor(Color.parseColor("#120f45"));
        web.addJavascriptInterface(new Bridge(), "AsesmenApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                return handleUrl(req.getUrl());
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                bar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                bar.setVisibility(View.GONE);
                CookieManager.getInstance().flush();
                view.evaluateJavascript(INJECT, null);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame()) offline.setVisibility(View.VISIBLE);
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int p) {
                bar.setProgress(p);
                bar.setVisibility(p < 100 ? View.VISIBLE : View.GONE);
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                Intent pick;
                try { pick = params.createIntent(); } catch (Exception e) { pick = new Intent(Intent.ACTION_GET_CONTENT).setType("*/*"); }
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(Intent.createChooser(pick, "Pilih berkas"), REQ_FILE);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    toast("Tidak ada aplikasi untuk memilih berkas.");
                    return false;
                }
                return true;
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    List<String> need = new ArrayList<>();
                    for (String r : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && !granted(Manifest.permission.CAMERA)) need.add(Manifest.permission.CAMERA);
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r) && !granted(Manifest.permission.RECORD_AUDIO)) need.add(Manifest.permission.RECORD_AUDIO);
                    }
                    if (need.isEmpty()) request.grant(request.getResources());
                    else { pendingPerm = request; requestPermissions(need.toArray(new String[0]), REQ_PERM); }
                });
            }
        });

        // unduhan biasa (http/https) — mis. lampiran dari server
        web.setDownloadListener((url, ua, cd, mime, len) -> {
            if (url.startsWith("blob:") || url.startsWith("data:")) return; // ditangani skrip INJECT
            try {
                android.app.DownloadManager.Request r = new android.app.DownloadManager.Request(Uri.parse(url));
                String name = URLUtil.guessFileName(url, cd, mime);
                r.setMimeType(mime);
                r.addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url));
                r.addRequestHeader("User-Agent", ua);
                r.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                ((android.app.DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(r);
                toast("Mengunduh " + name + "…");
            } catch (Exception e) {
                openExternal(Uri.parse(url));
            }
        });
    }

    /** Link milik website dibuka di aplikasi; link lain (WhatsApp, telepon, email, situs lain) dibuka di aplikasinya. */
    private boolean handleUrl(Uri u) {
        String sc = u.getScheme() == null ? "" : u.getScheme().toLowerCase();
        if ((sc.equals("http") || sc.equals("https")) && isOwn(u)) return false;
        if (sc.equals("intent")) {
            try {
                Intent i = Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME);
                startActivity(i);
            } catch (Exception e) { toast("Aplikasi tidak ditemukan."); }
            return true;
        }
        openExternal(u);
        return true;
    }

    private void openExternal(Uri u) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, u)); }
        catch (ActivityNotFoundException e) { toast("Tidak ada aplikasi untuk membuka tautan ini."); }
    }

    private boolean granted(String p) { return checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED; }

    private void toast(String m) { Toast.makeText(this, m, Toast.LENGTH_LONG).show(); }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code == REQ_PERM && pendingPerm != null) {
            List<String> ok = new ArrayList<>();
            for (String r : pendingPerm.getResources()) {
                if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && granted(Manifest.permission.CAMERA)) ok.add(r);
                else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r) && granted(Manifest.permission.RECORD_AUDIO)) ok.add(r);
                else if (!PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && !PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) ok.add(r);
            }
            if (ok.isEmpty()) { pendingPerm.deny(); toast("Izin ditolak. Aktifkan di Pengaturan > Aplikasi > Asesmen Merdeka > Izin."); }
            else pendingPerm.grant(ok.toArray(new String[0]));
            pendingPerm = null;
        } else if (code == REQ_STORAGE) {
            if (pendingSaveData != null && granted(Manifest.permission.WRITE_EXTERNAL_STORAGE)) writeDownload(pendingSaveName, pendingSaveMime, pendingSaveData);
            else if (pendingSaveData != null) toast("Izin penyimpanan ditolak, file tidak tersimpan.");
            pendingSaveData = null;
        }
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code != REQ_FILE || fileCallback == null) return;
        Uri[] out = null;
        if (result == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int n = data.getClipData().getItemCount();
                out = new Uri[n];
                for (int i = 0; i < n; i++) out[i] = data.getClipData().getItemAt(i).getUri();
            } else if (data.getData() != null) out = new Uri[]{data.getData()};
        }
        fileCallback.onReceiveValue(out);
        fileCallback = null;
    }

    /** Simpan file ke folder Download HP. */
    private void saveDownload(String name, String mime, byte[] bytes) {
        if (Build.VERSION.SDK_INT < 29 && !granted(Manifest.permission.WRITE_EXTERNAL_STORAGE)) {
            pendingSaveName = name; pendingSaveMime = mime; pendingSaveData = bytes;
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_STORAGE);
            return;
        }
        writeDownload(name, mime, bytes);
    }

    private void writeDownload(String name, String mime, byte[] bytes) {
        try {
            Uri uri;
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Downloads.DISPLAY_NAME, name);
                cv.put(MediaStore.Downloads.MIME_TYPE, mime);
                cv.put(MediaStore.Downloads.IS_PENDING, 1);
                uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (uri == null) throw new Exception("tidak bisa membuat file");
                try (OutputStream os = getContentResolver().openOutputStream(uri)) { os.write(bytes); }
                cv.clear();
                cv.put(MediaStore.Downloads.IS_PENDING, 0);
                getContentResolver().update(uri, cv, null, null);
            } else {
                File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!dir.exists()) dir.mkdirs();
                File f = new File(dir, name);
                int k = 1;
                while (f.exists()) {
                    int dot = name.lastIndexOf('.');
                    f = new File(dir, (dot > 0 ? name.substring(0, dot) : name) + " (" + (k++) + ")" + (dot > 0 ? name.substring(dot) : ""));
                }
                try (FileOutputStream os = new FileOutputStream(f)) { os.write(bytes); }
                uri = Uri.fromFile(f);
            }
            final Uri fUri = uri;
            new AlertDialog.Builder(this)
                    .setTitle("File tersimpan")
                    .setMessage(name + "\ntersimpan di folder Download.")
                    .setPositiveButton("Buka", (d, w) -> {
                        try {
                            Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(fUri, mime).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            startActivity(i);
                        } catch (Exception e) { toast("Tidak ada aplikasi untuk membuka file ini."); }
                    })
                    .setNegativeButton("Tutup", null)
                    .show();
        } catch (Exception e) {
            toast("Gagal menyimpan file: " + e.getMessage());
        }
    }

    /** Dipanggil dari JavaScript halaman (window.AsesmenApp). */
    private class Bridge {
        private final Handler ui = new Handler(Looper.getMainLooper());

        @JavascriptInterface
        public void saveFile(String name, String mime, String base64) {
            final byte[] bytes;
            try { bytes = Base64.decode(base64, Base64.DEFAULT); } catch (Exception e) { return; }
            final String safe = name == null || name.trim().isEmpty() ? "unduhan" : name.replaceAll("[\\\\/:*?\"<>|]", "_");
            String m = mime;
            if (m == null || m.isEmpty() || m.equals("application/octet-stream")) {
                int dot = safe.lastIndexOf('.');
                String g = dot > 0 ? android.webkit.MimeTypeMap.getSingleton().getMimeTypeFromExtension(safe.substring(dot + 1).toLowerCase()) : null;
                m = g != null ? g : "application/octet-stream";
            }
            final String fm = m;
            ui.post(() -> saveDownload(safe, fm, bytes));
        }

        @JavascriptInterface
        public void print(String title) {
            ui.post(() -> {
                PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                String job = (title == null || title.isEmpty()) ? "Asesmen Merdeka" : title;
                PrintDocumentAdapter ad = web.createPrintDocumentAdapter(job);
                pm.print(job, ad, new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
            });
        }

        @JavascriptInterface
        public void share(String text) {
            ui.post(() -> {
                Intent i = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text);
                startActivity(Intent.createChooser(i, "Bagikan"));
            });
        }

        @JavascriptInterface
        public String version() { return BuildConfig.VERSION_NAME; }
    }

    /**
     * Disuntikkan ke setiap halaman: unduhan blob/data (Excel, PDF, CSV) dikirim ke aplikasi,
     * window.print() memakai pencetak Android, dan penanda bahwa halaman dibuka dari aplikasi.
     */
    private static final String INJECT = "(function(){if(window.__asmApp)return;window.__asmApp=1;" +
            "document.documentElement.classList.add('in-app','standalone');" +
            "function send(a){var h=a.href||'',n=a.getAttribute('download')||'unduhan';" +
            "if(!/^(blob|data):/.test(h))return false;" +
            "fetch(h).then(function(r){return r.blob()}).then(function(b){var fr=new FileReader();" +
            "fr.onload=function(){var s=String(fr.result);AsesmenApp.saveFile(n,b.type||'',s.slice(s.indexOf(',')+1));};fr.readAsDataURL(b);});return true;}" +
            "var oc=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.hasAttribute('download')&&send(this))return;return oc.apply(this,arguments);};" +
            "document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[download]');if(a&&send(a))e.preventDefault();},true);" +
            "window.print=function(){AsesmenApp.print(document.title||'');};" +
            "})();";

    @Override
    public void onBackPressed() {
        if (offline.getVisibility() == View.VISIBLE) { super.onBackPressed(); return; }
        // tutup jendela/modal di halaman dulu (tombol Esc), lalu kembali ke halaman sebelumnya
        web.evaluateJavascript("(function(){var m=document.querySelector('.modal-bg,.sheet-bg,.pwa-sheet-bg');" +
                "if(m){var x=m.querySelector('[data-close]');if(x)x.click();else m.remove();return 'closed';}return '';})()", r -> {
            if (r != null && r.contains("closed")) return;
            if (web.canGoBack()) web.goBack();
            else MainActivity.super.onBackPressed();
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri d = intent.getData();
        if (d != null && isOwn(d)) web.loadUrl(d.toString());
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() { super.onPause(); web.onPause(); CookieManager.getInstance().flush(); }

    @Override
    protected void onResume() { super.onResume(); web.onResume(); }

}
