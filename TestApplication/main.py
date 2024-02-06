import sys
from types import NoneType
from PyQt5.QtWidgets import (
    QApplication,
    QWidget,
    QHBoxLayout,
    QVBoxLayout,
    QPushButton,
    QLabel,
    QRadioButton,
    QLineEdit,
    QMessageBox,
)

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

from ppadb.client import Client as AdbClient

cred = credentials.Certificate("lg-logisticsmanager-firebase-adminsdk.json")
app = firebase_admin.initialize_app(cred)
db = firestore.client()

COLLECTION_ACCOUNT = "account"
COLLECTION_DATA = "data"
BAES_ADB_SHELL_COMMAND = "am broadcast -a "
INTENT_ACTION_DEV_CHARGE = "INTENT_ACTION_DEV_CHARGE"


class TestApp(QWidget):
    def __init__(self, size):
        super().__init__()
        self.initUI(size)

    def initUI(self, size):
        print("initUI")
        width = size.width()
        height = size.height()

        # base
        self.setWindowTitle("Logistics App Tester")
        self.move(width // 4, height // 4)
        self.resize(width // 2, height // 2)

        self.setLayout(self.getInitLayout())
        self.show()

    def getInitLayout(self):
        self.rootLayout = QVBoxLayout()
        self.loginLayout = QHBoxLayout()
        self.loginBoxLayout = QVBoxLayout()

        self.idFieldLabel = QLabel("Enter your ID")
        self.idField = QLineEdit(self)
        self.idField.textChanged[str].connect(self.onIdChanged)
        self.loginButton = QPushButton("LOGIN")
        self.loginButton.clicked.connect(self.onLoginButtonClicked)
        self.loginBoxLayout.addStretch()
        self.loginBoxLayout.addWidget(self.idFieldLabel)
        self.loginBoxLayout.addWidget(self.idField)
        self.loginBoxLayout.addWidget(self.loginButton)
        self.loginBoxLayout.addStretch()
        self.loginLayout.addStretch()
        self.loginLayout.addLayout(self.loginBoxLayout)
        self.loginLayout.addStretch()
        self.rootLayout.addLayout(self.loginLayout)
        return self.rootLayout

    def onIdChanged(self, text):
        print("text", text)
        self.id = text

    def onPasswordChanged(self, text):
        print("onPasswordChanged", text)

    def onLoginButtonClicked(self):
        self.id = "kkh.kim@lge.com"
        doc_ref = db.collection(COLLECTION_ACCOUNT).document(self.id)
        doc = doc_ref.get()
        if doc.exists:
            data_ref = db.collection(COLLECTION_DATA).document(self.id)
            data_doc = data_ref.get()
            self.data = data_doc.to_dict()
            QMessageBox.information(self, "로그인 성공", "로그인 성공")
            self.loginCompleted()
        else:
            QMessageBox.information(self, "로그인 실패", "로그인 실패")

    def loginCompleted(self):
        self.clearLoginLayout()
        self.addUserInfoLayout()
        self.addBaseCommandLayout()
        self.rootLayout.addStretch(2)

    def addUserInfoLayout(self):
        self.userInfoLayout = QHBoxLayout()
        self.idLabel = QLabel("id")
        self.idField = QLineEdit(self)
        self.idField.setText(self.id)
        self.userInfoLayout.addWidget(self.idLabel)
        self.userInfoLayout.addWidget(self.idField)
        self.userInfoLayout.addStretch(2)
        self.rootLayout.addLayout(self.userInfoLayout)

    def addBaseCommandLayout(self):
        self.baseCommandLayout = QVBoxLayout()
        # devices
        self.deviceLabel = QLabel("device")
        self.deviceField = QLineEdit(self)
        self.deviceField.setFixedWidth(200)
        self.deviceLayout = QHBoxLayout()
        self.deviceLayout.addWidget(self.deviceLabel)
        self.deviceLayout.addWidget(self.deviceField)
        self.deviceLayout.addStretch()

        client = AdbClient(host="127.0.0.1", port=5037)
        devices = client.devices()
        for device in devices:
            self.device = device
            self.deviceField.setText(device.serial)

        # battery - 충전, 최소충전값, 충전중
        self.chargeLevelLabel = QLabel("충전값")
        self.chargeLevelField = QLineEdit(self)
        self.chargeLevelField.textChanged[str].connect(self.onChargeLevelFieldChange)
        self.autoChargeLevelLabel = QLabel("최소충전값")
        self.autoChargeLevelField = QLineEdit(self)
        self.autoChargeLevelField.textChanged[str].connect(
            self.onAutoChargeLevelFieldChange
        )
        self.isChargingLabel = QLabel("충전중")
        self.isChargingTrueBtn = QRadioButton("true", self)
        self.isChargingFalseBtn = QRadioButton("false", self)
        self.updateBtn = QPushButton("UPDATE")
        self.updateBtn.clicked.connect(self.onChargeEventUpdateClick)
        self.sendBtn = QPushButton("SEND")
        self.sendBtn.clicked.connect(self.onChargeEventSendClick)
        self.chargingLayout = QHBoxLayout()
        self.chargingLayout.addStretch()
        self.chargingLayout.addWidget(self.chargeLevelLabel)
        self.chargingLayout.addWidget(self.chargeLevelField)
        self.chargingLayout.addWidget(self.autoChargeLevelLabel)
        self.chargingLayout.addWidget(self.autoChargeLevelField)
        self.chargingLayout.addWidget(self.isChargingLabel)
        self.chargingLayout.addWidget(self.isChargingTrueBtn)
        self.chargingLayout.addWidget(self.isChargingFalseBtn)
        self.chargingLayout.addWidget(self.updateBtn)
        self.chargingLayout.addWidget(self.sendBtn)

        # init value
        print(self.data)
        self.chargeLevelField.setText(self.data["charge"])
        self.autoChargeLevelField.setText(self.data["autoCharge"])
        if self.data["isCharging"] == True:
            self.isChargingTrueBtn.setChecked(True)
        else:
            self.isChargingFalseBtn.setChecked(True)

        # emergency stop
        # navi error
        # robot status
        # barcode
        # mission
        # move

        self.baseCommandLayout.addLayout(self.deviceLayout)
        self.baseCommandLayout.addLayout(self.chargingLayout)
        self.baseCommandLayout.addStretch()
        self.baseCommandLayout.addStretch()
        self.rootLayout.addLayout(self.baseCommandLayout)

    def onChargeLevelFieldChange(self, text):
        self.chargeLevel = text

    def onAutoChargeLevelFieldChange(self, text):
        self.autoChargeLevel = text

    def onChargeEventUpdateClick(self):
        data_ref = db.collection(COLLECTION_DATA).document(self.id)
        data_ref.update(
            {
                "charge": self.chargeLevel,
                "autoCharge": self.autoChargeLevel,
                "isCharging": self.isChargingTrueBtn.isChecked(),
            }
        )

    def onChargeEventSendClick(self):
        command = BAES_ADB_SHELL_COMMAND + INTENT_ACTION_DEV_CHARGE
        command += " --ei battery_level " + self.chargeLevel
        command += " --ei auto_charge_level " + self.autoChargeLevel
        isCharging = "false"
        if self.isChargingTrueBtn.isChecked():
            isCharging = "true"
        command += " --ez is_charging " + isCharging
        print(command)
        self.device.shell(command)

    def clearLoginLayout(self):
        for i in reversed(range(self.loginBoxLayout.count())):
            item = self.loginBoxLayout.itemAt(i).widget()
            if (type(item)) != NoneType:
                item.setParent(None)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    screen = app.primaryScreen()
    size = screen.size()
    ex = TestApp(size)
    sys.exit(app.exec_())
