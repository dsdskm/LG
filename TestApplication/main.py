import sys
from types import NoneType
from PyQt5.QtWidgets import (
    QApplication,
    QMainWindow,
    QWidget,
    QHBoxLayout,
    QVBoxLayout,
    QPushButton,
    QLabel,
    QRadioButton,
    QLineEdit,
    QMessageBox,
    QGroupBox,
    QTabWidget,
)

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

from ppadb.client import Client as AdbClient

import time

cred = credentials.Certificate("lg-logisticsmanager-firebase-adminsdk.json")
app = firebase_admin.initialize_app(cred)
db = firestore.client()

COLLECTION_ACCOUNT = "account"
COLLECTION_DATA = "data"
ADB_SHELL_BROADCAST_COMMAND = "am broadcast -a "
ADB_SHELL_INPUT_COMMAND = "input tap "
INTENT_ACTION_DEV_CHARGE = "INTENT_ACTION_DEV_CHARGE"
INTENT_ACTION_DEV_EMERGENCY = "INTENT_ACTION_DEV_EMERGENCY"
INTENT_ACTION_DEV_ROBOT_STATUS_ERROR = "INTENT_ACTION_DEV_ROBOT_STATUS_ERROR"
INTENT_ACTION_DEV_NAVI_ERROR = "INTENT_ACTION_DEV_NAVI_ERROR"
INTENT_ACTION_DEV_MISSION = "INTENT_ACTION_DEV_MISSION"
INTENT_ACTION_DEV_BARCODE = "INTENT_ACTION_DEV_BARCODE"
INTENT_ACTION_MOVE_TO_MOUNTING = "INTENT_ACTION_MOVE_TO_MOUNTING"
INTENT_ACTION_MOVE_TO_PICKING = "INTENT_ACTION_MOVE_TO_PICKING"
INTENT_ACTION_MOVE_TO_PACKING = "INTENT_ACTION_MOVE_TO_PACKING"
INTENT_ACTION_MOVE_TO_CHARGER = "INTENT_ACTION_MOVE_TO_CHARGER"
INTENT_ACTION_ARRIVE = "INTENT_ACTION_ARRIVE"
INTENT_ACTION_ARRIVE_TO_WAITING = "INTENT_ACTION_ARRIVE_TO_WAITING"
INTENT_ACTION_ARRIVE_TO_MOUNTING = "INTENT_ACTION_ARRIVE_TO_MOUNTING"
INTENT_ACTION_ARRIVE_TO_PICKING = "INTENT_ACTION_ARRIVE_TO_PICKING"
INTENT_ACTION_ARRIVE_TO_PACKING = "INTENT_ACTION_ARRIVE_TO_PACKING"


class TestApp(QMainWindow):
    def __init__(self, size):
        super().__init__()

        self.setWindowTitle("물류 태블릿 앱 Test Application")
        tabs = QTabWidget()
        tabs.addTab(self.BasicWidget(), "Basic")
        tabs.addTab(self.TestCaseWidget(), "TestCase")
        tabs.addTab(QWidget(), "Random")

        self.setCentralWidget(tabs)

        # self.initUI(size)

    def BasicWidget(self):
        widget = QWidget()
        widget.setLayout(self.getBaseicLayout())
        return widget

    def TestCaseWidget(self):
        widget = QWidget()
        widget.setLayout(self.getTestCaseLayout())
        return widget

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

    def onTestCase1Click(self):
        # initial setup
        # 1. 언어 선택
        command = ADB_SHELL_INPUT_COMMAND + "600 400 "
        self.doCommand(command)
        time.sleep(5)
        # 2. 다음 버튼
        command = ADB_SHELL_INPUT_COMMAND + "600 1870 "
        self.doCommand(command)

    def getTestCaseLayout(self):
        rootLayout = QVBoxLayout()
        testCaseLayout1 = QVBoxLayout()
        sendButton1 = QPushButton("TestCase1 Run")
        sendButton1.clicked.connect(self.onTestCase1Click)

        testCaseLayout1.addWidget(sendButton1)
        rootLayout.addLayout(testCaseLayout1)
        return rootLayout

    def getBaseicLayout(self):
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
        command = ADB_SHELL_BROADCAST_COMMAND + INTENT_ACTION_DEV_BARCODE
        command += " --es value " + self.barcode
        self.doCommand(command)

    def onMissionEventSendClick(self):
        command = ADB_SHELL_BROADCAST_COMMAND + INTENT_ACTION_DEV_MISSION
        self.doCommand(command)

    def onSendNaviToMountingClick(self):
        command = ADB_SHELL_BROADCAST_COMMAND + INTENT_ACTION_MOVE_TO_MOUNTING
        self.doCommand(command)

    def onSendNaviToPickingClick(self):
        command = ADB_SHELL_BROADCAST_COMMAND + INTENT_ACTION_MOVE_TO_PICKING
        self.doCommand(command)

    def onSendNaviToPackingClick(self):
        command = ADB_SHELL_BROADCAST_COMMAND + INTENT_ACTION_MOVE_TO_PACKING
        self.doCommand(command)

    def onSendNaviToChargerClick(self):
        command = ADB_SHELL_BROADCAST_COMMAND + INTENT_ACTION_MOVE_TO_CHARGER
        self.doCommand(command)

    def onSendArriveClick(self):
        command = ADB_SHELL_BROADCAST_COMMAND + INTENT_ACTION_ARRIVE
        self.doCommand(command)

    def onSendArriveToWaitingClick(self):
        command = ADB_SHELL_BROADCAST_COMMAND + INTENT_ACTION_ARRIVE_TO_WAITING
        self.doCommand(command)

    def onSendArriveToMountingClick(self):
        command = ADB_SHELL_BROADCAST_COMMAND + INTENT_ACTION_ARRIVE_TO_MOUNTING
        self.doCommand(command)

    def onSendArriveToPickingClick(self):
        command = ADB_SHELL_BROADCAST_COMMAND + INTENT_ACTION_ARRIVE_TO_PICKING
        self.doCommand(command)

    def onSendArriveToPackingClick(self):
        command = ADB_SHELL_BROADCAST_COMMAND + INTENT_ACTION_ARRIVE_TO_PACKING
        self.doCommand(command)

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
        self.robotStatus = QLabel("MQTT")

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

    def addArriveLayout(self):
        # 대기 장소 도착
        # 장착 장소 도착
        # 피킹 장소 도찰
        # 하역 장소 도착
        self.naviLayout = QHBoxLayout()
        self.navi = QLabel("로봇 이동 도착")
        sendArriveToWaiting = QPushButton("대기 장소 도착")
        sendArriveToWaiting.clicked.connect(self.onSendArriveToWaitingClick)

        sendArriveToMounting = QPushButton("장착 장소 도착")
        sendArriveToMounting.clicked.connect(self.onSendArriveToMountingClick)

        sendArriveToPicking = QPushButton("피킹 장소 도착")
        sendArriveToPicking.clicked.connect(self.onSendArriveToPickingClick)

        sendArriveToPacking = QPushButton("하역 장소 도착")
        sendArriveToPacking.clicked.connect(self.onSendArriveToPackingClick)

        self.naviLayout.addStretch()
        self.naviLayout.addStretch()
        self.naviLayout.addStretch()
        self.naviLayout.addWidget(self.navi)
        self.naviLayout.addWidget(sendArriveToWaiting)
        self.naviLayout.addWidget(sendArriveToMounting)
        self.naviLayout.addWidget(sendArriveToPicking)
        self.naviLayout.addWidget(sendArriveToPacking)

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
        # move
        self.baseCommandLayout.addLayout(self.addMoveLayout())
        # arrive
        self.baseCommandLayout.addLayout(self.addArriveLayout())

        self.baseCommandLayout.addStretch()
        self.rootLayout.addLayout(self.baseCommandLayout)

    def addMoveLayout(self):
        # 장착 장소 이동
        # 피킹 장소 이동
        # 하역 장소 이동
        # 충전대 이동
        self.naviLayout = QHBoxLayout()
        self.navi = QLabel("로봇 이동 시작")
        sendNaviToMounting = QPushButton("장착 장소 이동중")
        sendNaviToMounting.clicked.connect(self.onSendNaviToMountingClick)

        sendNaviToPicking = QPushButton("피킹 장소 이동중")
        sendNaviToPicking.clicked.connect(self.onSendNaviToPickingClick)

        sendNaviToPacking = QPushButton("하역 장소 이동중")
        sendNaviToPacking.clicked.connect(self.onSendNaviToPackingClick)

        sendNaviToCharger = QPushButton("충전 장소 이동중")
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
        command = ADB_SHELL_BROADCAST_COMMAND + INTENT_ACTION_DEV_CHARGE
        command += " --ei battery_level " + self.chargeLevel
        command += " --ei auto_charge_level " + self.autoChargeLevel
        isCharging = "false"
        if self.isChargingTrueBtn.isChecked():
            isCharging = "true"
        command += " --ez is_charging " + isCharging
        self.doCommand(command)

    def onEmergencyEventSendClick(self):
        command = ADB_SHELL_BROADCAST_COMMAND + INTENT_ACTION_DEV_EMERGENCY
        command += " --es errCode 9999"
        command += " --ez fixed " + str(self.emergencyReleaseBtn.isChecked())
        self.doCommand(command)

    def onNaviErrorEventSendClick(self):
        command = ADB_SHELL_BROADCAST_COMMAND + INTENT_ACTION_DEV_NAVI_ERROR
        command += " --es errCode 9999"
        command += " --ez fixed " + str(self.naviErrorReleaseBtn.isChecked())
        self.doCommand(command)

    def onRobotStatusEventSendClick(self):
        command = ADB_SHELL_BROADCAST_COMMAND + INTENT_ACTION_DEV_ROBOT_STATUS_ERROR
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
    mainWindow = TestApp(size)
    mainWindow.show()
    # ex = TestApp(size)
    sys.exit(app.exec_())
