using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

using System;
using System.Windows;

namespace CursorTrailWallpaper
{
    public partial class MainWindow : Window
    {
        private readonly WebView2 webView;

        public MainWindow()
        {
            InitializeComponent();

            Width = SystemParameters.PrimaryScreenWidth;
            Height = SystemParameters.PrimaryScreenHeight;
            Left = 0;
            Top = 0;

            webView = new WebView2();

            RootGrid.Children.Add(webView);

            Loaded += MainWindow_Loaded;
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            try
            {
                await webView.EnsureCoreWebView2Async();

                webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
                webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
                webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                webView.CoreWebView2.Settings.IsZoomControlEnabled = false;

                webView.Source = new Uri(
                    "https://tk291008.github.io/my-wallpaper-dashboard/templates/cursor-trail/");
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.ToString(), "WebView2 Error");
            }
        }
    }
}