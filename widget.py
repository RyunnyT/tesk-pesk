import ctypes
import ctypes.wintypes
import os
import sys

from PyQt5.QtCore import QObject, Qt, QTimer, QUrl, pyqtSlot
from PyQt5.QtGui import QColor, QDesktopServices
from PyQt5.QtWebChannel import QWebChannel
from PyQt5.QtWebEngineWidgets import QWebEngineView
from PyQt5.QtWidgets import QApplication, QMainWindow


GRID_SIZE = 250
EDGE = 10
TITLEBAR_DRAG_HEIGHT = 52
RESERVED_RIGHT_CONTROLS_WIDTH = 800
DRAG_STOP_GAP = 5

WM_NCHITTEST = 0x0084
HTCAPTION = 2
HTLEFT = 10
HTRIGHT = 11
HTTOP = 12
HTTOPLEFT = 13
HTTOPRIGHT = 14
HTBOTTOM = 15
HTBOTTOMLEFT = 16
HTBOTTOMRIGHT = 17

user32 = ctypes.windll.user32

GWL_EXSTYLE = -20
WS_EX_LAYERED = 0x00080000
SWP_NOMOVE = 0x0002
SWP_NOSIZE = 0x0001
SWP_NOACTIVATE = 0x0010
SWP_SHOWWINDOW = 0x0040
HWND_BOTTOM = ctypes.wintypes.HWND(1)
HWND_TOPMOST = ctypes.wintypes.HWND(-1)


def resource_path(relative):
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, relative)


class DesktopBridge(QObject):
    def __init__(self, window):
        super().__init__()
        self.window = window

    @pyqtSlot()
    def close_app(self):
        QApplication.instance().quit()

    @pyqtSlot(int)
    def set_opacity(self, value):
        self.window.set_window_opacity_percent(value)

    @pyqtSlot(bool)
    def set_send_to_back(self, enabled):
        self.window.set_send_to_back(enabled)

    @pyqtSlot(result=int)
    def screen_width(self):
        return self.window.available_screen().width()

    @pyqtSlot(result=int)
    def grid_size(self):
        return GRID_SIZE

    @pyqtSlot(str)
    def open_url(self, url):
        QDesktopServices.openUrl(QUrl(url))


class MyDesktopWidget(QMainWindow):
    def __init__(self):
        super().__init__()
        self.sent_to_back = False

        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground)

        screen = self.available_screen()
        self.setMinimumSize(GRID_SIZE * 2, GRID_SIZE * 2)
        self.setMaximumWidth(screen.width())
        self.resize(screen.width(), int(screen.height() * 0.82))
        self.move(screen.x(), screen.y())

        self.browser = QWebEngineView(self)
        self.browser.page().setBackgroundColor(QColor(0, 0, 0, 0))
        self.browser.setUrl(QUrl.fromLocalFile(resource_path("index.html")))

        self.channel = QWebChannel(self.browser.page())
        self.bridge = DesktopBridge(self)
        self.channel.registerObject("pyBridge", self.bridge)
        self.browser.page().setWebChannel(self.channel)

    def available_screen(self):
        return QApplication.primaryScreen().availableGeometry()

    def set_window_opacity_percent(self, value):
        value = max(50, min(100, int(value)))
        self.setWindowOpacity(value / 100.0)

    def set_send_to_back(self, enabled):
        self.sent_to_back = bool(enabled)
        hwnd = int(self.winId())
        target = HWND_BOTTOM if self.sent_to_back else HWND_TOPMOST
        flags = SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW
        user32.SetWindowPos(hwnd, target, 0, 0, 0, 0, flags)
        self.show()

    def resizeEvent(self, event):
        super().resizeEvent(event)
        self.browser.setGeometry(0, 0, self.width(), self.height())

    def mousePressEvent(self, event):
        if event.button() == Qt.RightButton:
            self.close()
            return
        super().mousePressEvent(event)

    def nativeEvent(self, event_type, message):
        if event_type == b"windows_generic_MSG":
            msg = ctypes.wintypes.MSG.from_address(int(message))
            if msg.message == WM_NCHITTEST:
                x = ctypes.c_short(msg.lParam & 0xFFFF).value
                y = ctypes.c_short((msg.lParam >> 16) & 0xFFFF).value
                rect = self.frameGeometry()

                lx = x - rect.x()
                ly = y - rect.y()
                width = rect.width()
                height = rect.height()

                on_left = lx <= EDGE
                on_right = lx >= width - EDGE
                on_top = ly <= EDGE
                on_bottom = ly >= height - EDGE

                if on_top and on_left:
                    return True, HTTOPLEFT
                if on_top and on_right:
                    return True, HTTOPRIGHT
                if on_bottom and on_left:
                    return True, HTBOTTOMLEFT
                if on_bottom and on_right:
                    return True, HTBOTTOMRIGHT
                if on_left:
                    return True, HTLEFT
                if on_right:
                    return True, HTRIGHT
                if on_top:
                    return True, HTTOP
                if on_bottom:
                    return True, HTBOTTOM

                draggable_band = EDGE < ly <= TITLEBAR_DRAG_HEIGHT
                drag_limit = max(EDGE, width - RESERVED_RIGHT_CONTROLS_WIDTH - DRAG_STOP_GAP)
                draggable_left_zone = EDGE < lx < drag_limit
                if draggable_band and draggable_left_zone:
                    return True, HTCAPTION

        return super().nativeEvent(event_type, message)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    app.setAttribute(Qt.AA_EnableHighDpiScaling, True)
    app.setAttribute(Qt.AA_UseHighDpiPixmaps, True)
    window = MyDesktopWidget()
    window.show()
    sys.exit(app.exec_())
