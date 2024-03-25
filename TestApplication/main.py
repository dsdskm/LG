import sys
import os
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
    QScrollArea
)
from PyQt5.QtGui import QPixmap
from PyQt5.QtCore import Qt
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
ADB_SHELL_INPUT_SWIPE_COMMAND = "input swipe "
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

    def loadScreenshot(self, title):
        pixmap = QPixmap(title + ".png")
        pixmap = pixmap.scaledToWidth(400)
        img_label = QLabel()
        img_label.setPixmap(pixmap)
        img_title = QLabel(title)
        vBox = QVBoxLayout()
        vBox.addWidget(img_label)
        vBox.addWidget(img_title)
        return vBox

    def onTestCase1Click(self):
        # initial setup
        # 1. 언어 선택
        self.screencaptureAndPull("test1-start")
        command = ADB_SHELL_INPUT_COMMAND + "600 400 "
        self.doCommand(command)
        self.screencaptureAndPull("test1-1")
        # 2. 다음 버튼
        command = ADB_SHELL_INPUT_COMMAND + "600 1870 "
        self.doCommand(command)
        self.screencaptureAndPull("test1-end")

        hBox = QHBoxLayout()
        hBox.addLayout(self.loadScreenshot("test1-start"))
        hBox.addLayout(self.loadScreenshot("test1-1"))
        hBox.addLayout(self.loadScreenshot("test1-end"))
        self.testCase1Layout.addLayout(hBox)

    def onTestCase2Click(self):
        # initial setup
        # 1. clear 버튼
        self.screencaptureAndPull("test2-start")
        command = ADB_SHELL_INPUT_COMMAND + "1100 530 "
        self.doCommand(command)
        self.screencaptureAndPull("test2-1")
        # 2. 입력 뷰 선택
        command = ADB_SHELL_INPUT_COMMAND + "100 530 "
        self.doCommand(command)
        # 3-1. 지점코드 입력 C
        command = ADB_SHELL_INPUT_COMMAND + "442 1789 "
        self.doCommand(command)
        # 3-2. 지점코드 입력 0
        command = ADB_SHELL_INPUT_COMMAND + "49 1872"  # ABC전환키
        self.doCommand(command)
        command = ADB_SHELL_INPUT_COMMAND + "1031 1588"
        self.doCommand(command)
        # 3-3. 지점코드 입력 9
        command = ADB_SHELL_INPUT_COMMAND + "938 1588 "
        self.doCommand(command)
        # 3-4. 지점코드 입력 1
        command = ADB_SHELL_INPUT_COMMAND + "171 1588 "
        self.doCommand(command)
        # 3-5. 지점코드 입력 I
        command = ADB_SHELL_INPUT_COMMAND + "49 1872"
        self.doCommand(command)
        command = ADB_SHELL_INPUT_COMMAND + "833 1569 "
        self.doCommand(command)
        # 3-6. 지점코드 입력 T
        command = ADB_SHELL_INPUT_COMMAND + "546 1569 "
        self.doCommand(command)
        # 3-7. 지점코드 입력 X
        command = ADB_SHELL_INPUT_COMMAND + "328 1781 "
        self.doCommand(command)
        # 3-8. 지점코드 입력 F
        command = ADB_SHELL_INPUT_COMMAND + "478 1685 "
        self.doCommand(command)
        self.screencaptureAndPull("test2-2")
        # 4. 완료 버튼
        command = ADB_SHELL_INPUT_COMMAND + "1098 1677 "
        self.doCommand(command)
        self.screencaptureAndPull("test2-3")
        time.sleep(10)
        self.screencaptureAndPull("test2-4")
        # 5. 다음 버튼
        command = ADB_SHELL_INPUT_COMMAND + "889 1870 "
        self.doCommand(command)
        self.screencaptureAndPull("test2-end")
        scrollArea = QScrollArea()
        hBox = QHBoxLayout()
        hBox.addLayout(self.loadScreenshot("test2-start"))
        hBox.addLayout(self.loadScreenshot("test2-1"))
        hBox.addLayout(self.loadScreenshot("test2-2"))
        hBox.addLayout(self.loadScreenshot("test2-3"))
        hBox.addLayout(self.loadScreenshot("test2-4"))
        hBox.addLayout(self.loadScreenshot("test2-end"))
        scrollArea.setLayout(hBox)
        self.testCase2Layout.addWidget(scrollArea)

    def onTestCase3Click(self):
        # initial setup
        # 1-1. 연동할 로봇을 선택해 주세요. 10회 터치
        self.screencaptureAndPull("test3-start")
        for i in range(10):
            command = ADB_SHELL_INPUT_COMMAND + "616 248 "
            self.doCommand(command)
        # 1-2. 입력 창 선택
        command = ADB_SHELL_INPUT_COMMAND + "250 956 "
        self.doCommand(command)
        # 1-3. 2580
        command = ADB_SHELL_INPUT_COMMAND + "267 1483 "
        self.doCommand(command)
        command = ADB_SHELL_INPUT_COMMAND + "541 1483 "
        self.doCommand(command)
        command = ADB_SHELL_INPUT_COMMAND + "827 1483 "
        self.doCommand(command)
        command = ADB_SHELL_INPUT_COMMAND + "1048 1503 "
        self.doCommand(command)
        # 1-4. 히든 모드 설정
        command = ADB_SHELL_INPUT_COMMAND + "707 1068 "
        self.doCommand(command)
        self.screencaptureAndPull("test3-1")
        # 2. Fake 로봇 선택
        command = ADB_SHELL_INPUT_SWIPE_COMMAND + "616 248 616 248 1000"
        self.doCommand(command)
        self.screencaptureAndPull("test3-end")

        hBox = QHBoxLayout()
        hBox.addLayout(self.loadScreenshot("test3-start"))
        hBox.addLayout(self.loadScreenshot("test3-1"))
        hBox.addLayout(self.loadScreenshot("test3-end"))
        self.testCase3Layout.addLayout(hBox)

    def onTestCase4Click(self):
        # initial setup
        self.screencaptureAndPull("test4-start")
        # 1. 서비스 이용 약관
        command = ADB_SHELL_INPUT_COMMAND + "100 425 "
        self.doCommand(command)
        self.screencaptureAndPull("test4-1")
        command = ADB_SHELL_INPUT_COMMAND + "112 409 "
        self.doCommand(command)
        self.screencaptureAndPull("test4-2")
        # 2. 소프트웨어 사용 계약
        command = ADB_SHELL_INPUT_COMMAND + "100 565 "
        self.doCommand(command)
        self.screencaptureAndPull("test4-3")
        command = ADB_SHELL_INPUT_COMMAND + "112 409 "
        self.doCommand(command)
        self.screencaptureAndPull("test4-4")
        # 3. 다음 버튼
        command = ADB_SHELL_INPUT_COMMAND + "889 1870 "
        self.doCommand(command)
        self.screencaptureAndPull("test4-5")
        time.sleep(15)
        self.screencaptureAndPull("test4-6")
        # # 4. 완료 버튼
        # command = ADB_SHELL_INPUT_COMMAND + "600 1870 "
        # self.doCommand(command)
        # self.screencaptureAndPull("test4-end")


        scrollArea = QScrollArea()

        hBox = QHBoxLayout()
        hBox.addLayout(self.loadScreenshot("test4-start"))
        hBox.addLayout(self.loadScreenshot("test4-1"))
        hBox.addLayout(self.loadScreenshot("test4-2"))
        hBox.addLayout(self.loadScreenshot("test4-3"))
        hBox.addLayout(self.loadScreenshot("test4-4"))
        hBox.addLayout(self.loadScreenshot("test4-5"))
        hBox.addLayout(self.loadScreenshot("test4-6"))
        hBox.addLayout(self.loadScreenshot("test4-end"))
        scrollArea.setWidgetResizable(True)
        scrollArea.setLayout(hBox)
        self.testCase3Layout.addWidget(scrollArea)

    def getTestCaseLayout(self):
        rootLayout = QVBoxLayout()
        self.testCase1Layout = QVBoxLayout()
        self.testCase1Layout.addLayout(
            self.getTestCaseRow(
                "TC_물류_타사_옴론_CONTROL_APP_Initial Setup_2.1.언어",
                "TestCase1",
                self.onTestCase1Click,
            )
        )
        self.testCase2Layout = QVBoxLayout()
        self.testCase2Layout.addLayout(
            self.getTestCaseRow(
                "TC_물류_타사_옴론_CONTROL_APP_Initial Setup_2.2.지점코드 로그인",
                "TestCase2",
                self.onTestCase2Click,
            )
        )
        self.testCase3Layout = QVBoxLayout()
        self.testCase3Layout.addLayout(
            self.getTestCaseRow(
                "TC_물류_타사_옴론_CONTROL_APP_Initial Setup_2.3.로봇 연동",
                "TestCase3",
                self.onTestCase3Click,
            )
        )
        self.testCase4Layout = QVBoxLayout()
        self.testCase4Layout.addLayout(
            self.getTestCaseRow(
                "TC_물류_타사_옴론_CONTROL_APP_Initial Setup_2.4.약관 및 정책",
                "TestCase4",
                self.onTestCase4Click,
            )
        )
        rootLayout.addLayout(self.testCase1Layout)
        rootLayout.addLayout(self.testCase2Layout)
        rootLayout.addLayout(self.testCase3Layout)
        rootLayout.addLayout(self.testCase4Layout)
        scrollArea = QScrollArea()
        hBox = QHBoxLayout()
        hBox.addLayout(self.loadScreenshot("test4-start"))
        hBox.addLayout(self.loadScreenshot("test4-1"))
        hBox.addLayout(self.loadScreenshot("test4-2"))
        hBox.addLayout(self.loadScreenshot("test4-3"))
        hBox.addLayout(self.loadScreenshot("test4-4"))
        hBox.addLayout(self.loadScreenshot("test4-5"))
        hBox.addLayout(self.loadScreenshot("test4-6"))
        hBox.addLayout(self.loadScreenshot("test4-end"))
        scrollArea.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOn)
        scrollArea.setWidgetResizable(True)
        scrollArea.setLayout(hBox)
        self.testCase4Layout.addWidget(scrollArea)
        return rootLayout

    def getTestCaseRow(self, title, button, clickEvent):
        testCaseLayout = QHBoxLayout()
        testCaseTitle = QLabel(title)
        testCaseButton = QPushButton(button)
        testCaseButton.clicked.connect(clickEvent)
        testCaseLayout.addWidget(testCaseButton)
        testCaseLayout.addWidget(testCaseTitle)
        return testCaseLayout

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
        time.sleep(2)
        if self.device != None:
            self.device.shell(command)
        else:
            QMessageBox.information(self, "Error", "adb가 연결되지 않았습니다.")

    def screencaptureAndPull(self, name):
        print("screencapture ", name)
        time.sleep(2)
        command = (
            "adb shell screencap -p /sdcard/shot.png && adb pull /sdcard/shot.png "
            + name
            + ".png"
        )
        os.system(command)
        time.sleep(2)

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
