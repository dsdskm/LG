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
    QGroupBox,
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
INTENT_ACTION_DEV_EMERGENCY = "INTENT_ACTION_DEV_EMERGENCY"
INTENT_ACTION_DEV_ROBOT_STATUS_ERROR = "INTENT_ACTION_DEV_ROBOT_STATUS_ERROR"
INTENT_ACTION_DEV_NAVI_ERROR = "INTENT_ACTION_DEV_NAVI_ERROR"
INTENT_ACTION_DEV_MISSION = "INTENT_ACTION_DEV_MISSION"
INTENT_ACTION_DEV_BARCODE = "INTENT_ACTION_DEV_BARCODE"
INTENT_ACTION_DEV_MOVE = "INTENT_ACTION_DEV_MOVE"


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

    def initDevice(self):
        try:
            client = AdbClient(host="127.0.0.1", port=5037)
            devices = client.devices()
            for device in devices:
                self.device = device
                if hasattr(self, "deviceField"):
                    self.deviceField.setText(self.device.serial)
        except:
            print("adb error")
            self.device = None
            if hasattr(self, "deviceField"):
                self.deviceField.setText("not connected")

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
        self.id = text

    def onBarcodeChanged(self, text):
        self.barcode = text

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

    def onBarcodeEventSendClick(self):
        command = BAES_ADB_SHELL_COMMAND + INTENT_ACTION_DEV_BARCODE
        command += " --es value " + self.barcode
        self.doCommand(command)

    def onMissionEventSendClick(self):
        command = BAES_ADB_SHELL_COMMAND + INTENT_ACTION_DEV_MISSION
        self.doCommand(command)

    def onSendNaviToMountingClick(self):
        command = BAES_ADB_SHELL_COMMAND + INTENT_ACTION_DEV_MOVE
        command += " --ei moveStatus -1"
        pass

    def onSendNaviToPickingClick(self):
        pass

    def onSendNaviToPackingClick(self):
        pass

    def onSendNaviToChargerClick(self):
        pass

    def onSendArriveClick(self):
        pass

    def loginCompleted(self):
        self.clearLoginLayout()
        self.addUserInfoLayout()
        self.addBaseCommandLayout()
        self.rootLayout.addStretch(2)
        self.initDevice()

    def addUserInfoLayout(self):
        self.userInfoLayout = QHBoxLayout()
        self.idLabel = QLabel("id")
        self.idField = QLineEdit(self)
        self.idField.setText(self.id)
        self.userInfoLayout.addWidget(self.idLabel)
        self.userInfoLayout.addWidget(self.idField)
        self.userInfoLayout.addStretch(2)
        self.rootLayout.addLayout(self.userInfoLayout)

    def addDeviceLayout(self):
        self.deviceLabel = QLabel("device")
        self.deviceField = QLineEdit(self)
        self.deviceField.setFixedWidth(200)
        self.deviceRefreshBtn = QPushButton("REFRESH")
        self.deviceRefreshBtn.clicked.connect(self.onDeviceRefreshBtnClicked)
        self.deviceLayout = QHBoxLayout()
        self.deviceLayout.addWidget(self.deviceLabel)
        self.deviceLayout.addWidget(self.deviceField)
        self.deviceLayout.addWidget(self.deviceRefreshBtn)
        self.deviceLayout.addStretch()
        return self.deviceLayout

    def addChargeLayout(self):
        self.chargingLayout = QHBoxLayout()
        self.chargeLevelLabel = QLabel("충전값")
        self.chargeLevelField = QLineEdit(self)
        self.chargeLevelField.textChanged[str].connect(self.onChargeLevelFieldChange)
        self.autoChargeLevelLabel = QLabel("최소충전값")
        self.autoChargeLevelField = QLineEdit(self)
        self.autoChargeLevelField.textChanged[str].connect(
            self.onAutoChargeLevelFieldChange
        )
        self.isChargingLabel = QLabel("충전중")
        chareBtnGroup = QGroupBox()
        chargeBtnLayout = QHBoxLayout()
        self.isChargingTrueBtn = QRadioButton("true", self)
        self.isChargingFalseBtn = QRadioButton("false", self)
        chargeBtnLayout.addWidget(self.isChargingTrueBtn)
        chargeBtnLayout.addWidget(self.isChargingFalseBtn)
        chareBtnGroup.setLayout(chargeBtnLayout)

        self.updateBtn = QPushButton("UPDATE")
        self.updateBtn.clicked.connect(self.onChargeEventUpdateClick)
        sendBtn = QPushButton("SEND")
        sendBtn.clicked.connect(self.onChargeEventSendClick)

        self.chargingLayout.addStretch()
        self.chargingLayout.addStretch()
        self.chargingLayout.addWidget(self.chargeLevelLabel)
        self.chargingLayout.addWidget(self.chargeLevelField)
        self.chargingLayout.addWidget(self.autoChargeLevelLabel)
        self.chargingLayout.addWidget(self.autoChargeLevelField)
        self.chargingLayout.addWidget(self.isChargingLabel)
        self.chargingLayout.addWidget(chareBtnGroup)
        self.chargingLayout.addWidget(sendBtn)

        # init value
        print(self.data)
        self.chargeLevelField.setText(self.data["charge"])
        self.autoChargeLevelField.setText(self.data["autoCharge"])
        if self.data["isCharging"] == True:
            self.isChargingTrueBtn.setChecked(True)
        else:
            self.isChargingFalseBtn.setChecked(True)

        return self.chargingLayout

    def addEmergencyLayout(self):
        self.emergencyGroup = QGroupBox(self)
        self.emergencyLayout = QHBoxLayout()
        self.emergency = QLabel("비상 정지")

        emergencyBtnGroup = QGroupBox()
        emergencyBtnLayout = QHBoxLayout()
        self.emergencyStopBtn = QRadioButton("발생", self)
        self.emergencyReleaseBtn = QRadioButton("해제", self)
        self.emergencyStopBtn.setChecked(True)
        emergencyBtnLayout.addWidget(self.emergencyStopBtn)
        emergencyBtnLayout.addWidget(self.emergencyReleaseBtn)
        emergencyBtnGroup.setLayout(emergencyBtnLayout)

        sendBtn = QPushButton("SEND")
        sendBtn.clicked.connect(self.onEmergencyEventSendClick)
        self.emergencyLayout.addStretch()
        self.emergencyLayout.addWidget(self.emergency)
        self.emergencyLayout.addWidget(emergencyBtnGroup)
        self.emergencyLayout.addWidget(sendBtn)

        return self.emergencyLayout

    def addNaviErrorLayout(self):
        self.naviErrorLayout = QHBoxLayout()
        self.naviError = QLabel("주행 에러")
        naviErrorBtnGroup = QGroupBox()
        naviErrorBtnLayout = QHBoxLayout()
        self.naviErrorBtn = QRadioButton("발생", self)
        self.naviErrorReleaseBtn = QRadioButton("해제", self)
        self.naviErrorBtn.setChecked(True)
        naviErrorBtnLayout.addWidget(self.naviErrorBtn)
        naviErrorBtnLayout.addWidget(self.naviErrorReleaseBtn)
        naviErrorBtnGroup.setLayout(naviErrorBtnLayout)

        sendBtn = QPushButton("SEND")
        sendBtn.clicked.connect(self.onNaviErrorEventSendClick)
        self.naviErrorLayout.addStretch()
        self.naviErrorLayout.addWidget(self.naviError)
        self.naviErrorLayout.addWidget(naviErrorBtnGroup)
        self.naviErrorLayout.addWidget(sendBtn)

        return self.naviErrorLayout

    def addRobotStatusLayout(self):
        self.robotStatusLayout = QHBoxLayout()
        self.robotStatus = QLabel("로봇 상태")

        robotStatusBtnGrouop = QGroupBox()
        robotStatusBtnLayout = QHBoxLayout()
        self.robotStatusOffBtn = QRadioButton("OFF", self)
        self.robotStatusOnBtn = QRadioButton("ON", self)
        self.robotStatusOffBtn.setChecked(True)
        robotStatusBtnLayout.addWidget(self.robotStatusOffBtn)
        robotStatusBtnLayout.addWidget(self.robotStatusOnBtn)
        robotStatusBtnGrouop.setLayout(robotStatusBtnLayout)

        sendBtn = QPushButton("SEND")
        sendBtn.clicked.connect(self.onRobotStatusEventSendClick)
        self.robotStatusLayout.addStretch()
        self.robotStatusLayout.addWidget(self.robotStatus)
        self.robotStatusLayout.addWidget(robotStatusBtnGrouop)
        self.robotStatusLayout.addWidget(sendBtn)

        return self.robotStatusLayout

    def addBarcodeLayout(self):
        self.barcodeLayout = QHBoxLayout()
        self.barcode = QLabel("바코드")
        self.barcodeField = QLineEdit(self)
        self.barcodeField.textChanged[str].connect(self.onBarcodeChanged)

        sendBtn = QPushButton("SEND")
        sendBtn.clicked.connect(self.onBarcodeEventSendClick)
        self.barcodeLayout.addStretch()
        self.barcodeLayout.addStretch()
        self.barcodeLayout.addStretch()
        self.barcodeLayout.addWidget(self.barcode)
        self.barcodeLayout.addWidget(self.barcodeField)
        self.barcodeLayout.addWidget(sendBtn)

        return self.barcodeLayout

    def addMissionLayout(self):
        self.missionLayout = QHBoxLayout()
        self.mission = QLabel("미션 할당")
        sendBtn = QPushButton("SEND")
        sendBtn.clicked.connect(self.onMissionEventSendClick)
        self.missionLayout.addStretch()
        self.missionLayout.addStretch()
        self.missionLayout.addStretch()
        self.missionLayout.addWidget(self.mission)
        self.missionLayout.addWidget(sendBtn)
        return self.missionLayout

    def addNaviLayout(self):
        # 장착 장소 이동
        # 피킹 장소 이동
        # 하역 장소 이동
        # 충전대 이동
        self.naviLayout = QHBoxLayout()
        self.navi = QLabel("로봇 이동")
        sendNaviToMounting = QPushButton("장착 장소 이동")
        sendNaviToMounting.clicked.connect(self.onSendNaviToMountingClick)

        sendNaviToPicking = QPushButton("피킹 장소 이동")
        sendNaviToPicking.clicked.connect(self.onSendNaviToPickingClick)

        sendNaviToPacking = QPushButton("하역 장소 이동")
        sendNaviToPacking.clicked.connect(self.onSendNaviToPackingClick)

        sendNaviToCharger = QPushButton("충전 장소 이동")
        sendNaviToCharger.clicked.connect(self.onSendNaviToChargerClick)

        sendArrive = QPushButton("도착")
        sendArrive.clicked.connect(self.onSendArriveClick)

        self.naviLayout.addStretch()
        self.naviLayout.addStretch()
        self.naviLayout.addStretch()
        self.naviLayout.addWidget(self.navi)
        self.naviLayout.addWidget(sendNaviToMounting)
        self.naviLayout.addWidget(sendNaviToPicking)
        self.naviLayout.addWidget(sendNaviToPacking)
        self.naviLayout.addWidget(sendNaviToCharger)
        self.naviLayout.addWidget(sendArrive)

        return self.naviLayout

    def addBaseCommandLayout(self):
        self.baseCommandLayout = QVBoxLayout()
        # devices
        self.baseCommandLayout.addLayout(self.addDeviceLayout())
        # battery - 충전, 최소충전값, 충전중
        self.baseCommandLayout.addLayout(self.addChargeLayout())
        # emergency stop
        self.baseCommandLayout.addLayout(self.addEmergencyLayout())
        # navi error
        self.baseCommandLayout.addLayout(self.addNaviErrorLayout())
        # robot status
        self.baseCommandLayout.addLayout(self.addRobotStatusLayout())
        # barcode
        self.baseCommandLayout.addLayout(self.addBarcodeLayout())
        # mission
        self.baseCommandLayout.addLayout(self.addMissionLayout())
        # navi
        self.baseCommandLayout.addLayout(self.addNaviLayout())
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
        self.doCommand(command)

    def onEmergencyEventSendClick(self):
        command = BAES_ADB_SHELL_COMMAND + INTENT_ACTION_DEV_EMERGENCY
        command += " --es errCode 9999"
        command += " --ez fixed " + str(self.emergencyReleaseBtn.isChecked())
        self.doCommand(command)

    def onNaviErrorEventSendClick(self):
        command = BAES_ADB_SHELL_COMMAND + INTENT_ACTION_DEV_NAVI_ERROR
        command += " --es errCode 9999"
        command += " --ez fixed " + str(self.naviErrorReleaseBtn.isChecked())
        self.doCommand(command)

    def onRobotStatusEventSendClick(self):
        command = BAES_ADB_SHELL_COMMAND + INTENT_ACTION_DEV_ROBOT_STATUS_ERROR
        command += " --es errCode 9999"
        command += " --ez fixed " + str(self.robotStatusOnBtn.isChecked())
        self.doCommand(command)

    def clearLoginLayout(self):
        for i in reversed(range(self.loginBoxLayout.count())):
            item = self.loginBoxLayout.itemAt(i).widget()
            if (type(item)) != NoneType:
                item.setParent(None)

    def onDeviceRefreshBtnClicked(self):
        self.initDevice()

    def doCommand(self, command):
        print("command", command)
        if self.device != None:
            self.device.shell(command)
        else:
            QMessageBox.information(self, "Error", "adb가 연결되지 않았습니다.")

    def chargeBtnUpdate(self):
        if self.isChargingTrueBtn.isChecked():
            self.isChargingFalseBtn.setChecked(False)
        if self.isChargingFalseBtn.isChecked():
            self.isChargingTrueBtn.setChecked(False)

    def emergencyBtnUpdate(self):
        if self.emergencyStopBtn.isChecked():
            self.emergencyReleaseBtn.setChecked(False)
        if self.emergencyReleaseBtn.isChecked():
            self.emergencyStopBtn.setChecked(False)

    def naviErrorBtnUpdate(self):
        if self.naviErrorBtn.isChecked():
            self.naviErrorReleaseBtn.setChecked(False)
        if self.emergencyReleaseBtn.isChecked():
            self.naviErrorReleaseBtn.setChecked(False)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    screen = app.primaryScreen()
    size = screen.size()
    ex = TestApp(size)
    sys.exit(app.exec_())
