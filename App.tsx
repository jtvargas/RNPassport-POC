import React, { useState, useRef, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Button,
  SafeAreaView,
  Dimensions,
  NativeModules,
  NativeEventEmitter,
} from 'react-native';
import {
  Camera,
  useCameraPermission,
  useCameraDevice,
  useCameraFormat,
  useFrameProcessor,
  runAtTargetFps,
  VisionCameraProxy,
  Frame,
} from 'react-native-vision-camera';
import { useAppState } from '@react-native-community/hooks';
import { scanOCR } from '@ismaelmoreiraa/vision-camera-ocr';
import { useSharedValue, Worklets } from 'react-native-worklets-core';
import filter from 'lodash/filter';
import isNil from 'lodash/isNil';
import isEmpty from 'lodash/isEmpty';
import find from 'lodash/find';
import reduce from 'lodash/reduce';
import replace from 'lodash/replace';
import map from 'lodash/map';

const ScreenAspectRatio =
  Dimensions.get('window').height / Dimensions.get('window').width;

const VIEW_HEIGHT = Dimensions.get('screen').height;
const VIEW_WIDTH = Dimensions.get('screen').width;

// const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera);
// Reanimated.addWhitelistedNativeProps({
//   zoom: true,
// });

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

const MRZScannerModule = NativeModules.MRZScanner;
const MRZScannerEvents = new NativeEventEmitter(MRZScannerModule);
const MRZCameraPlugin = VisionCameraProxy.initFrameProcessorPlugin('MRZScan');

// MRZScannerEvents.initMRZ();

// function hasValidPassport(mrz: string) {
//   // Regular expression to match passport types
//   const passportRegex = /P<|D<|S<|O<|TP</;
//   return passportRegex.test(mrz);
// }

// function filterPassportObjects(objects) {
//   return filter(objects, obj => obj.text && hasValidPassport(obj.text));
// }
// function scoreMRZSimilarity(text: string): number {
//   const mrzPattern = /^[A-Z0-9<]{88}$/;

//   if (isEmpty(text)) return 0;
//   // Check for multiple 'K's in sequence
//   if (text.includes('KK')) return 0;

//   let score = 0;
//   if (mrzPattern.test(text) && hasValidPassport(text)) {
//     score = text.split('').reduce((acc, char) => {
//       return acc + (/[A-Z0-9<]/.test(char) ? 1 : 0);
//     }, 0);
//   }

//   return score;
// }

// function adjustStringLength(input: string, targetLength: number): string {
//   let adjustedString = input.replace(/</g, ''); // Remove all filler characters

//   // If the string is still longer than the target length, truncate it
//   if (adjustedString.length > targetLength) {
//     adjustedString = adjustedString.substring(0, targetLength);
//   }

//   // Optional: If the string is shorter, pad it with filler characters '<'
//   while (adjustedString.length < targetLength) {
//     adjustedString += '<';
//   }

//   return adjustedString;
// }

// function cleanMRZ(mrz) {
//   // First, replace any occurrences of "«K" with '<'
//   let cleanedMRZ = replace(mrz, /«K/g, '<<');
//   const cleanedMRZWithoutK = replace(cleanedMRZ, /<K</g, '<<<');

//   // Replace any other invalid characters (anything not A-Z, 0-9, or <) with '<'
//   cleanedMRZ = replace(cleanedMRZWithoutK, /[^A-Z0-9<]/g, '<');

//   return adjustStringLength(cleanedMRZ, 88);
// }

// // Find a way to extract the MRZ, it looks like is returning me the lines
// function findMostSimilarMRZ(blocks: TextBlock[]): TextBlock {
//   let maxScore = 0;
//   // let mostSimilarString = '';
//   let mostSimilar = null;

//   blocks.forEach(block => {
//     const textToAnalize = map(block.lines, line => line.text).join('');
//     console.log({ textToAnalizeCleaned: cleanMRZ(textToAnalize) });
//     const score = scoreMRZSimilarity(textToAnalize ?? '');
//     if (score > maxScore) {
//       maxScore = score;
//       // mostSimilarString = block.text;
//       mostSimilar = block;
//     }
//   });

//   return mostSimilar;
// }

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
  const isValid = useRef<boolean>(false);
  const [ocrResults, setOcr] = useState<OCRFrame | null>(null);
  const [stopCamera, setStopCamera] = useState<boolean>(false);
  const [blockValid, setBlockValid] = useState<TextBlock>(null);
  // const ocrResults = useSharedValue<OCRFrame | null>(null);

  // "MRZ_DETECTION_SUCCESSFUL", "MRZ_ANALYZING_PENDING", "MRZ_INITIALIZED", "MRZ_NOT_INITIALIZED"
  // Adding event listeners and cleanup logic for native module events

  const takePhoto = async () => {
    const photo = await camera.current.takePhoto({
      qualityPrioritization: 'speed',
      flash: 'off',
    });
    // const result = await fetch(`file://${photo.path}`);
    // const data = await result.blob();
    console.log({ PHOTO_TAKEN: photo });
  };

  const validMRZ = (blocks: TextBlock[]) => {
    if (isNil(blocks) || isEmpty(blocks)) {
      return false;
    }
    const blocksValid = filterPassportObjects(blocks);
    if (!isNil(blocksValid) && !isEmpty(blocksValid)) {
      const mostSimilarBlock = findMostSimilarMRZ(blocksValid);
      console.log({ mostSimilarBlock });
      if (!isNil(mostSimilarBlock) && !isEmpty(mostSimilarBlock)) {
        console.log({ mostSimilarBlock });

        // setBlockValid(mostSimilarBlock);
        // setStopCamera(true);
      }
      return true;
    }
    return false;
  };

  const updateOcrValueInJS = Worklets.createRunInJsFn((ocrValue: OCRFrame) => {
    // console.log('RUN IN JS AFTER WORKLET', ocrValue);
    // isValid.current = true;
    // ocrResults.value = ocrValue;
    // setOcr(ocrValue as OCRFrame);
    // const isValidMRZ = validMRZ(ocrValue.result.blocks);
    // console.log(`is valid MRZ: ${isValidMRZ}`);
  });

  const frameProcessor = useFrameProcessor(frame => {
    'worklet';

    const mrzResult = MRZCameraPlugin.call(frame);
    console.log({ mrzResult });
    // console.log(`Frame: ${frame.width}x${frame.height} (${frame.pixelFormat})`);

    // // ocrResults.value = `Frame: ${frame.width}x${frame.height} (${frame.pixelFormat})`;
    // runAtTargetFps(30, () => {
    //   'worklet';

    //   const scannedOcr = scanOCR(frame);
    // updateOcrValueInJS('value sended to the JS thread');
    // });
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
            {/* {ocrResults?.result
              ? ocrResults.result?.blocks?.map((block, index) => {
                  return <Text>{block.text}</Text>;
                })
              : null} */}
            <Text> {`MRZ: ${blockValid?.text ?? ''}`}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setStopCamera(curr => !curr)}
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

  useEffect(() => {
    MRZScannerEvents.addListener('MRZ_NOT_INITIALIZED', result => {
      console.log({ NATIVE_EVENT: 'MRZ_NOT_INITIALIZED', value: result });
    });
    MRZScannerEvents.addListener('MRZ_INITIALIZED', result => {
      console.log({ NATIVE_EVENT: 'MRZ_INITIALIZED', value: result });
    });
    MRZScannerEvents.addListener('MRZ_ANALYZING_PENDING', result => {
      console.log({ NATIVE_EVENT: 'MRZ_ANALYZING_PENDING', value: result });
    });
    MRZScannerEvents.addListener('MRZ_DETECTION_SUCCESSFUL', result => {
      console.log({ NATIVE_EVENT: 'MRZ_DETECTION_SUCCESSFUL', value: result });
    });
    MRZScannerEvents.addListener('MRZ_INIT_WITH_DEFAULT_CONFIG', result => {
      console.log({
        NATIVE_EVENT: 'MRZ_INIT_WITH_DEFAULT_CONFIG',
        value: result,
      });
    });

    return () => {
      MRZScannerEvents.removeAllListeners('MRZ_NOT_INITIALIZED');
      MRZScannerEvents.removeAllListeners('MRZ_INITIALIZED');
      MRZScannerEvents.removeAllListeners('MRZ_ANALYZING_PENDING');
      MRZScannerEvents.removeAllListeners('MRZ_DETECTION_SUCCESSFUL');
      MRZScannerEvents.removeAllListeners('MRZ_INIT_WITH_DEFAULT_CONFIG');
    };
  }, []);

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
