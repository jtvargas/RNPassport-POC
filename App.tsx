import React, { useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Button,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import {
  Camera,
  useCameraPermission,
  useCameraDevice,
  useCameraFormat,
  useFrameProcessor,
  VisionCameraProxy,
} from 'react-native-vision-camera';
import { useAppState } from '@react-native-community/hooks';
import { scanOCR } from '@ismaelmoreiraa/vision-camera-ocr';
import { Worklets } from 'react-native-worklets-core';

import { parse as parseMRZ } from 'mrz';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxProcessor: {
    height: Dimensions.get('window').height / 6,
    width: '100%',
    borderColor: 'red',
    borderWidth: 2,
    position: 'absolute',
    top: '45%',
    marginHorizontal: 20,
  },
});

type BoundingFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  boundingCenterX: number;
  boundingCenterY: number;
};
type Point = { x: number; y: number };

type TextElement = {
  text: string;
  frame: BoundingFrame;
  cornerPoints: Point[];
};

type TextLine = {
  text: string;
  elements: TextElement[];
  frame: BoundingFrame;
  recognizedLanguages: string[];
  cornerPoints: Point[];
};

type TextBlock = {
  text: string;
  lines: TextLine[];
  frame: BoundingFrame;
  recognizedLanguages: string[];
  cornerPoints: Point[];
};

type ResultFrame = {
  text: string;
  blocks: TextBlock[];
};

export type OCRFrame = {
  result: ResultFrame;
};

const MRZCameraPlugin = VisionCameraProxy.initFrameProcessorPlugin('MRZScan');

function replaceWildcardsWithOCR(baseString, ocrText) {
  let result = '';

  for (let i = 0; i < baseString.length; i++) {
    if (baseString[i] === '*') {
      result += ocrText[i];
    } else if (ocrText[i] !== baseString[i]) {
      result += baseString[i];
    } else {
      result += baseString[i];
    }
  }
  return result;
}

function splitStringEvery44Chars(str) {
  return str.match(/.{1,44}/g);
}

function CameraView({ onCloseCamera, isCameraActive }) {
  const device = useCameraDevice('back', {
    physicalDevices: ['wide-angle-camera'],
  });
  const format = useCameraFormat(device, [
    { videoResolution: { width: 1080, height: 720 } },
    { pixelFormat: 'yuv' },
  ]);
  const appState = useAppState();
  const isActive = appState === 'active' && isCameraActive;
  const camera = useRef<Camera>(null);
  const [stopCamera, setStopCamera] = useState<boolean>(false);
  useState<string>('');
  const [mrzTextResult, setMRZText] = useState<string>('');
  const [mrzData, setMRZData] = useState<
    | {
        lastName: string;
        firstName: string;
        nationality: string;
        documentNumber: string;
      }
    | Record<string, never>
  >({});

  const updateOcrValueInJS = Worklets.createRunInJsFn(
    ({
      mrzCombinedLines,
      ocrResult,
      isValidResult,
    }: {
      isValidResult: boolean;
      mrzCombinedLines: string;
      ocrResult: string[];
    }) => {
      if (isValidResult) {
        const mrzCleaned = replaceWildcardsWithOCR(
          mrzCombinedLines,
          ocrResult.join(''),
        );
        const mrzParsed = parseMRZ(splitStringEvery44Chars(mrzCleaned));
        if (mrzParsed?.valid) {
          setStopCamera(true);
          setMRZData({
            lastName: mrzParsed.fields.lastName,
            firstName: mrzParsed.fields.firstName,
            nationality: mrzParsed.fields.nationality,
            documentNumber: mrzParsed.fields.documentNumber,
          });
          setMRZText(mrzCleaned);
        }
      }
    },
  );

  const frameProcessor = useFrameProcessor(frame => {
    'worklet';

    const mrzResult = MRZCameraPlugin.call(frame);
    const mrzParsed = mrzResult ? JSON.parse(mrzResult) : null;
    const mrzZone =
      mrzParsed && mrzParsed.zones && mrzParsed.zones.length > 0
        ? mrzParsed.zones[0]
        : null;

    let mrzCombinedLines = '';
    if (mrzZone) {
      mrzCombinedLines = mrzZone.lines.reduce((currLine, line) => {
        return line.confidence >= 90 ? currLine + line.text : currLine;
      }, '');
    }

    const resultOCR = scanOCR(frame);
    const resultTextSplitted =
      resultOCR.result && resultOCR.result.text
        ? resultOCR.result.text.split('\n')
        : [];
    const resultFiltered = resultTextSplitted
      .filter(string => string.includes('<<'))
      .map(string => string.replaceAll(' ', ''))
      .filter(string => string.length === 44);

    const isValidResult = resultFiltered.join('').length === 88;

    if (mrzCombinedLines.length === 88 && isValidResult) {
      updateOcrValueInJS({
        isValidResult,
        ocrResult: resultFiltered,
        mrzCombinedLines,
        // wrappedBox: mrzZone.wrappedBox,
      });
    }
  }, []);

  if (device == null)
    return (
      <View style={styles.container}>
        <Text>ERROR WHILE MOUNTING CAMERA</Text>
      </View>
    );

  return (
    <>
      <Camera
        ref={camera}
        style={{
          height: Dimensions.get('window').height / 6,
          width: '100%',
          position: 'absolute',
          // top: '45%',
          top: '20%',
        }}
        device={device}
        isActive={isActive && !stopCamera}
        format={format}
        photo
        frameProcessor={frameProcessor}
      />
      {isActive ? (
        <SafeAreaView
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              height: 30,
              width: 30,
              position: 'absolute',
              // top: VIEW_HEIGHT / 2,
              // right: VIEW_WIDTH,
              backgroundColor: 'red',
            }}
          />
          <View style={styles.boxProcessor} />
          <View style={[styles.boxProcessor, { top: '10%' }]}>
            <Text> {`MRZ: ${mrzTextResult ?? ''}`}</Text>
            <Text>documentNumber: {mrzData.documentNumber}</Text>
            <Text>firstName: {mrzData.firstName}</Text>
            <Text>lastName: {mrzData.lastName}</Text>
            <Text>nationality: {mrzData.nationality}</Text>
          </View>
          <TouchableOpacity
            onPress={() => null}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              borderWidth: 8,
              borderColor: 'gray',
              backgroundColor: 'white',
              opacity: 0.8,
              marginBottom: 40,
            }}
          />
          <TouchableOpacity
            onPress={onCloseCamera}
            style={{
              padding: 4,
              borderRadius: 20,
              borderWidth: 4,
              borderColor: 'gray',
              backgroundColor: 'white',
              marginBottom: 40,
              opacity: 0.4,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStopCamera(curr => !curr)}
            style={{
              padding: 4,
              borderRadius: 20,
              borderWidth: 4,
              borderColor: 'gray',
              backgroundColor: 'white',
              marginBottom: 40,
              opacity: 0.4,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text>Stop</Text>
          </TouchableOpacity>
        </SafeAreaView>
      ) : null}
    </>
  );
}

export default function App() {
  const [showCamera, setShowCamera] = useState(false);
  const { hasPermission, requestPermission } = useCameraPermission();

  const verifyPermissions = async () => {
    if (hasPermission) {
      return Promise.resolve(true);
    }
    try {
      const requestPermissionResponse = await requestPermission();
      if (requestPermissionResponse) {
        return Promise.resolve(true);
      }

      return Promise.resolve(false);
    } catch (e) {
      console.log('ERROR WHILE REQUESTING CAMERA PERMISSIONS', e);
      return Promise.reject(e);
    }
  };

  const handleOpenCamera = async () => {
    // MRZScannerModule.processFrames(1, "[{ hello: '1' }]", 320, 320, 0, 1);
    const canOpenCamera = await verifyPermissions();
    if (canOpenCamera) {
      setShowCamera(true);
    }
  };

  if (showCamera)
    return (
      <CameraView onCloseCamera={() => setShowCamera(false)} isCameraActive />
    );

  return (
    <View style={styles.container}>
      <Text>Open up App.TS to start working on your app!</Text>
      <Button title="Open Camera" onPress={handleOpenCamera} />
      <StatusBar style="auto" />
      {/* <View style={styles.boxProcessor} /> */}
    </View>
  );
}
