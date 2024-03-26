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
    QScrollArea,
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
        command = ADB_SHELL_INPUT_COMMAND + "600 400 "
        self.doCommand(command)
        # 2. 다음 버튼
        command = ADB_SHELL_INPUT_COMMAND + "600 1870 "
        self.doCommand(command)

    def onTestCase2Click(self):
        # initial setup
        # 1. clear 버튼
        command = ADB_SHELL_INPUT_COMMAND + "1100 530 "
        self.doCommand(command)
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
        # 4. 완료 버튼
        command = ADB_SHELL_INPUT_COMMAND + "1098 1677 "
        self.doCommand(command)
        time.sleep(10)
        # 5. 다음 버튼
        command = ADB_SHELL_INPUT_COMMAND + "889 1870 "
        self.doCommand(command)

    def onTestCase3Click(self):
        # initial setup
        # 1-1. 연동할 로봇을 선택해 주세요. 10회 터치
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
        # 2. Fake 로봇 선택
        command = ADB_SHELL_INPUT_SWIPE_COMMAND + "616 248 616 248 1000"
        self.doCommand(command)

    def onTestCase4Click(self):
        # initial setup
        # 1. 서비스 이용 약관
        command = ADB_SHELL_INPUT_COMMAND + "100 425 "
        self.doCommand(command)
        command = ADB_SHELL_INPUT_COMMAND + "112 409 "
        self.doCommand(command)
        # 2. 소프트웨어 사용 계약
        command = ADB_SHELL_INPUT_COMMAND + "100 565 "
        self.doCommand(command)
        command = ADB_SHELL_INPUT_COMMAND + "112 409 "
        self.doCommand(command)
        # 3. 다음 버튼
        command = ADB_SHELL_INPUT_COMMAND + "889 1870 "
        self.doCommand(command)
        # 4. 확인 버튼
        command = ADB_SHELL_INPUT_COMMAND + "600 1870 "
        self.doCommand(command)

    def onTestCase5Click(self):
        # 물류 배송
        # 1. 장착 장소 이동
        self.onSendNaviToMountingClick()
        # 2. 장착 장소 도착 & 미션 확인
        self.onMissionEventSendClick()
        # 3. 토트 장착 가이드 다음 버튼
        command = ADB_SHELL_INPUT_COMMAND + "600 1870 "
        self.doCommand(command)
        self.barcode = "A"
        self.onBarcodeEventSendClick()
        self.barcode = ""
        # 4. 출발
        command = ADB_SHELL_INPUT_COMMAND + "889 1870 "
        self.doCommand(command)
        # 5. 피킹 장소 이동
        self.onSendNaviToPickingClick()

    def onTestCase6Click(self):
        # 물류 배송
        # 1. 피킹 장소 도착
        self.onSendArriveToPickingClick()

        # 2. 바코드 & 일괄 처리
        self.barcode = "8809839851362"
        self.onBarcodeEventSendClick()
        self.onBarcodeEventSendClick()
        self.barcode = ""

        command = ADB_SHELL_INPUT_COMMAND + "1012 1072 "
        self.doCommand(command)
        # 3. 완료
        command = ADB_SHELL_INPUT_COMMAND + "714 1225 "
        self.doCommand(command)
        # 4. 다음 장소로 출발
        command = ADB_SHELL_INPUT_COMMAND + "714 1219 "
        self.doCommand(command)
        # 5. 하역 장소 이동
        self.onSendNaviToPackingClick()

    def onTestCase7Click(self):
        # 물류 배송
        # 1. 하역 장소 도착
        self.onSendArriveToPackingClick()
        # 2. 업무 결과 확인
        command = ADB_SHELL_INPUT_COMMAND + "600 1883 "
        self.doCommand(command)

    def onTestCase8Click(self):
        # 설정
        # 1. 설정 진입
        command = ADB_SHELL_INPUT_COMMAND + "612 1050 "
        self.doCommand(command)

        # 2. 언어 진입
        command = ADB_SHELL_INPUT_COMMAND + "488 423 "
        self.doCommand(command)

        # 3. 언어 선택
        command = ADB_SHELL_INPUT_COMMAND + "634 292 "
        self.doCommand(command)

        # 4. 뒤로 가기
        command = ADB_SHELL_INPUT_COMMAND + "64 102 "
        self.doCommand(command)

        command = ADB_SHELL_INPUT_COMMAND + "64 102 "
        self.doCommand(command)

    def onTestCase9Click(self):
        # 설정
        # 1. 설정 진입
        command = ADB_SHELL_INPUT_COMMAND + "612 1050 "
        self.doCommand(command)

        # 2. 로봇 제어 진입
        command = ADB_SHELL_INPUT_COMMAND + "488 552 "
        self.doCommand(command)

        # 3. 업무 중단 선택
        command = ADB_SHELL_INPUT_COMMAND + "634 292 "
        self.doCommand(command)

        # 4. 업무 중단
        command = ADB_SHELL_INPUT_COMMAND + "724 1213 "
        self.doCommand(command)

    def onTestCase10Click(self):
        # 설정
        # 1. 설정 진입
        command = ADB_SHELL_INPUT_COMMAND + "612 1050 "
        self.doCommand(command)

        # 2. 법률 정보 진입
        command = ADB_SHELL_INPUT_COMMAND + "488 691 "
        self.doCommand(command)

        # 3. 서비스 이용 약관 선택
        command = ADB_SHELL_INPUT_COMMAND + "634 292 "
        self.doCommand(command)

        # 4. 뒤로 가기
        command = ADB_SHELL_INPUT_COMMAND + "64 102 "
        self.doCommand(command)

        # 4. 소프트웨어 사용권 계약
        command = ADB_SHELL_INPUT_COMMAND + "634 435 "
        self.doCommand(command)

        # 4. 뒤로 가기
        command = ADB_SHELL_INPUT_COMMAND + "64 102 "
        self.doCommand(command)

        # 4. 뒤로 가기
        command = ADB_SHELL_INPUT_COMMAND + "64 102 "
        self.doCommand(command)

        command = ADB_SHELL_INPUT_COMMAND + "64 102 "
        self.doCommand(command)

    def onTestCase11Click(self):
        # 설정
        # 1. 설정 진입
        command = ADB_SHELL_INPUT_COMMAND + "612 1050 "
        self.doCommand(command)

        # 2. 초기화 선택
        command = ADB_SHELL_INPUT_COMMAND + "488 990 "
        self.doCommand(command)

        # 3. 초기화
        command = ADB_SHELL_INPUT_COMMAND + "729 1132 "
        self.doCommand(command)
        
    def onTestCase12Click(self):
        # 설정
        # 1. 설정 진입
        command = ADB_SHELL_INPUT_COMMAND + "612 1050 "
        self.doCommand(command)

        # 2. 오픈 소스 진입
        command = ADB_SHELL_INPUT_COMMAND + "488 826 "
        self.doCommand(command)

        # 3. 뒤로 가기
        command = ADB_SHELL_INPUT_COMMAND + "64 102 "
        self.doCommand(command)

        command = ADB_SHELL_INPUT_COMMAND + "64 102 "
        self.doCommand(command)

    def onTestCase13Click(self):
        # 배송
        # 1. 일시 정지 클릭
        command = ADB_SHELL_INPUT_COMMAND + "1090 177 "
        self.doCommand(command)

        # 2. 배송 정보
        command = ADB_SHELL_INPUT_COMMAND + "640 1019 "
        self.doCommand(command)
        command = ADB_SHELL_INPUT_COMMAND + "615 1118 "
        self.doCommand(command)

        # 3. 이동 재개
        command = ADB_SHELL_INPUT_COMMAND + "600 1365 "
        self.doCommand(command)
    def onTestCase14Click(self):
        # 배송
        # 1. 일시 정지 클릭
        command = ADB_SHELL_INPUT_COMMAND + "1090 177 "
        self.doCommand(command)

        # 2. 이동 재개
        command = ADB_SHELL_INPUT_COMMAND + "633 1215 "
        self.doCommand(command)

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

        self.testCase5Layout = QVBoxLayout()
        self.testCase5Layout.addLayout(
            self.getTestCaseRow(
                "TC_물류_타사_옴론_CONTROL_APP_물류배송_1.1.출발 준비 (1) 장착 가이드 (2) 토트 스캔 가이드",
                "TestCase5",
                self.onTestCase5Click,
            )
        )

        self.testCase6Layout = QVBoxLayout()
        self.testCase6Layout.addLayout(
            self.getTestCaseRow(
                "TC_물류_타사_옴론_CONTROL_APP_물류배송_1.2.피킹 장소 (1) 오더/총량 피킹 (2) 적재 수량 입력 (3) 업무 상세 정보",
                "TestCase6",
                self.onTestCase6Click,
            )
        )

        self.testCase7Layout = QVBoxLayout()
        self.testCase7Layout.addLayout(
            self.getTestCaseRow(
                "TC_물류_타사_옴론_CONTROL_APP_물류배송_1.3.하역 장소",
                "TestCase7",
                self.onTestCase7Click,
            )
        )

        self.testCase8Layout = QVBoxLayout()
        self.testCase8Layout.addLayout(
            self.getTestCaseRow(
                "TC_물류_타사_옴론_CONTROL_APP_물류배송_3.3.언어",
                "TestCase8",
                self.onTestCase8Click,
            )
        )

        self.testCase9Layout = QVBoxLayout()
        self.testCase9Layout.addLayout(
            self.getTestCaseRow(
                "TC_물류_타사_옴론_CONTROL_APP_물류배송_3.4.로봇 제어",
                "TestCase9",
                self.onTestCase9Click,
            )
        )

        self.testCase10Layout = QVBoxLayout()
        self.testCase10Layout.addLayout(
            self.getTestCaseRow(
                "TC_물류_타사_옴론_CONTROL_APP_물류배송_3.5.법률 정보",
                "TestCase10",
                self.onTestCase10Click,
            )
        )

        self.testCase11Layout = QVBoxLayout()
        self.testCase11Layout.addLayout(
            self.getTestCaseRow(
                "TC_물류_타사_옴론_CONTROL_APP_물류배송_3.6.초기화",
                "TestCase11",
                self.onTestCase11Click,
            )
        )

        self.testCase12Layout = QVBoxLayout()
        self.testCase12Layout.addLayout(
            self.getTestCaseRow(
                "TC_물류_타사_옴론_CONTROL_APP_물류배송_3.7.오픈 소스",
                "TestCase12",
                self.onTestCase12Click,
            )
        )

        self.testCase13Layout = QVBoxLayout()
        self.testCase13Layout.addLayout(
            self.getTestCaseRow(
                "TC_물류_타사_옴론_CONTROL_APP_Policy_일시정지-배송정보",
                "TestCase13",
                self.onTestCase13Click,
            )
        )
        
        self.testCase14Layout = QVBoxLayout()
        self.testCase14Layout.addLayout(
            self.getTestCaseRow(
                "TC_물류_타사_옴론_CONTROL_APP_Policy_일시정지",
                "TestCase14",
                self.onTestCase14Click,
            )
        )

        rootLayout.addLayout(self.testCase1Layout)
        rootLayout.addLayout(self.testCase2Layout)
        rootLayout.addLayout(self.testCase3Layout)
        rootLayout.addLayout(self.testCase4Layout)
        rootLayout.addLayout(self.testCase5Layout)
        rootLayout.addLayout(self.testCase6Layout)
        rootLayout.addLayout(self.testCase7Layout)
        rootLayout.addLayout(self.testCase8Layout)
        rootLayout.addLayout(self.testCase9Layout)
        rootLayout.addLayout(self.testCase10Layout)
        rootLayout.addLayout(self.testCase11Layout)
        rootLayout.addLayout(self.testCase12Layout)
        rootLayout.addLayout(self.testCase13Layout)
        rootLayout.addLayout(self.testCase14Layout)

        # scrollArea = QScrollArea()
        # hBox = QHBoxLayout()
        # hBox.addLayout(self.loadScreenshot("test4-start"))
        # hBox.addLayout(self.loadScreenshot("test4-1"))
        # hBox.addLayout(self.loadScreenshot("test4-2"))
        # hBox.addLayout(self.loadScreenshot("test4-3"))
        # hBox.addLayout(self.loadScreenshot("test4-4"))
        # hBox.addLayout(self.loadScreenshot("test4-5"))
        # hBox.addLayout(self.loadScreenshot("test4-6"))
        # hBox.addLayout(self.loadScreenshot("test4-end"))
        # scrollArea.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOn)
        # scrollArea.setWidgetResizable(True)
        # scrollArea.setLayout(hBox)
        # self.testCase4Layout.addWidget(scrollArea)
        return rootLayout

    def getTestCaseRow(self, title, button, clickEvent):
        testCaseLayout = QHBoxLayout()
        testCaseTitle = QLabel(title)
        testCaseButton = QPushButton(button)
        testCaseButton.setFixedWidth(100)
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
        self.barcodeLabel = QLabel("바코드")
        self.barcodeField = QLineEdit(self)
        self.barcodeField.textChanged[str].connect(self.onBarcodeChanged)

        sendBtn = QPushButton("SEND")
        sendBtn.clicked.connect(self.onBarcodeEventSendClick)
        self.barcodeLayout.addStretch()
        self.barcodeLayout.addStretch()
        self.barcodeLayout.addStretch()
        self.barcodeLayout.addWidget(self.barcodeLabel)
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
        time.sleep(1)
        if self.device != None:
            self.device.shell(command)
        else:
            QMessageBox.information(self, "Error", "adb가 연결되지 않았습니다.")

    def screencaptureAndPull(self, name):
        print("screencapture ", name)
        time.sleep(1)
        command = (
            "adb shell screencap -p /sdcard/shot.png && adb pull /sdcard/shot.png "
            + name
            + ".png"
        )
        os.system(command)
        time.sleep(1)

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
