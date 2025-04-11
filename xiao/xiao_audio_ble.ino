/*
 * Audio Recording and Bluetooth Transmission for Seeed XIAO nRF52840 Sense
 * 
 * This sketch initializes the microphone on the Seeed XIAO nRF52840 Sense,
 * samples audio data, and transmits it over Bluetooth Low Energy.
 */

#include <bluefruit.h>
#include <PDM.h>

// BLE Service and Characteristic UUIDs
#define AUDIO_SERVICE_UUID        "00000000-0000-1000-8000-00805f9b34fb"
#define AUDIO_CHARACTERISTIC_UUID "00000000-0000-1000-8000-00805f9b34fa"

// Audio settings
#define SAMPLE_RATE 16000  // Sample rate in Hz
#define BUFFER_SIZE 512    // Audio buffer size
#define BLE_PACKET_SIZE 20 // Size of BLE packets (limited by MTU)

// PDM buffer
short sampleBuffer[BUFFER_SIZE];
volatile int samplesRead = 0;

// BLE Service and Characteristic
BLEService audioService(AUDIO_SERVICE_UUID);
BLECharacteristic audioCharacteristic(AUDIO_CHARACTERISTIC_UUID);

// Recording state
bool isRecording = false;

void setup() {
  Serial.begin(115200);
  
  // Wait for serial if debug mode is enabled
  #ifdef DEBUG
  while (!Serial) delay(10);
  #endif
  
  Serial.println("Seeed XIAO nRF52840 Sense Audio BLE");
  
  // Initialize PDM microphone
  if (!setupMicrophone()) {
    Serial.println("Failed to initialize PDM microphone!");
    while (1) delay(10);
  }
  
  // Initialize BLE
  setupBLE();
}

void loop() {
  // Process BLE events
  Bluefruit.Advertising.restartOnDisconnect(true);
  
  // Process audio data if samples are available and recording is active
  if (samplesRead && isRecording) {
    // Send audio data over BLE in chunks
    sendAudioData();
    
    // Reset samples read
    samplesRead = 0;
  }
  
  // Small delay to prevent tight looping
  delay(1);
}

bool setupMicrophone() {
  // Configure the data receive callback
  PDM.onReceive(onPDMdata);
  
  // Initialize PDM with:
  // - one channel (mono mode)
  // - 16 kHz sample rate
  if (!PDM.begin(1, SAMPLE_RATE)) {
    return false;
  }
  
  // Set the gain (between 0 and 80)
  PDM.setGain(40);
  
  return true;
}

void setupBLE() {
  // Initialize Bluefruit with maximum connections as peripheral
  Bluefruit.begin(1, 0);
  Bluefruit.setName("XIAO Audio");
  
  // Set the connect/disconnect callback handlers
  Bluefruit.Periph.setConnectCallback(connect_callback);
  Bluefruit.Periph.setDisconnectCallback(disconnect_callback);
  
  // Configure and start the BLE Peripheral Advertising
  startAdv();
  
  // Setup the Audio service and characteristic
  setupAudioService();
  
  Serial.println("BLE setup complete");
}

void startAdv(void) {
  // Advertising packet
  Bluefruit.Advertising.addFlags(BLE_GAP_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE);
  Bluefruit.Advertising.addTxPower();
  
  // Include the Audio Service UUID
  Bluefruit.Advertising.addService(audioService);
  
  // Include Name
  Bluefruit.Advertising.addName();
  
  // Start Advertising
  Bluefruit.Advertising.restartOnDisconnect(true);
  Bluefruit.Advertising.setInterval(32, 244);    // in unit of 0.625 ms
  Bluefruit.Advertising.setFastTimeout(30);      // number of seconds in fast mode
  Bluefruit.Advertising.start(0);                // 0 = Don't stop advertising after n seconds
}

void setupAudioService() {
  // Configure the Audio Service
  audioService.begin();
  
  // Configure the Audio Characteristic
  audioCharacteristic.setProperties(CHR_PROPS_READ | CHR_PROPS_WRITE | CHR_PROPS_NOTIFY);
  audioCharacteristic.setPermission(SECMODE_OPEN, SECMODE_OPEN);
  audioCharacteristic.setFixedLen(BLE_PACKET_SIZE);
  audioCharacteristic.setCccdWriteCallback(cccd_callback);  // Notify enabled/disabled
  audioCharacteristic.setWriteCallback(write_callback);     // Command handling
  audioCharacteristic.begin();
}

void connect_callback(uint16_t conn_handle) {
  // Get the reference to current connection
  BLEConnection* connection = Bluefruit.Connection(conn_handle);
  
  char central_name[32] = { 0 };
  connection->getPeerName(central_name, sizeof(central_name));
  
  Serial.print("Connected to ");
  Serial.println(central_name);
  
  // Request a larger MTU size if possible
  connection->requestMtuExchange(247);
}

void disconnect_callback(uint16_t conn_handle, uint8_t reason) {
  (void) conn_handle;
  (void) reason;
  
  Serial.println("Disconnected");
  
  // Stop recording when disconnected
  isRecording = false;
}

void cccd_callback(uint16_t conn_hdl, BLECharacteristic* chr, uint16_t cccd_value) {
  // Display the raw CCCD value
  Serial.print("CCCD Updated: ");
  
  // Check if notifications are enabled
  if (chr->notifyEnabled(conn_hdl)) {
    Serial.println("Notifications enabled");
  } else {
    Serial.println("Notifications disabled");
    // Stop recording when notifications are disabled
    isRecording = false;
  }
}

void write_callback(uint16_t conn_hdl, BLECharacteristic* chr, uint8_t* data, uint16_t len) {
  // Convert the received data to a string for command processing
  char command[len + 1];
  memcpy(command, data, len);
  command[len] = '\0';
  
  Serial.print("Received command: ");
  Serial.println(command);
  
  // Process commands
  if (strcmp(command, "START") == 0) {
    isRecording = true;
    Serial.println("Recording started");
  } else if (strcmp(command, "STOP") == 0) {
    isRecording = false;
    Serial.println("Recording stopped");
  }
}

void onPDMdata() {
  // Read the PDM data
  int bytesAvailable = PDM.available();
  
  // Read into the sample buffer
  if (bytesAvailable > 0) {
    PDM.read(sampleBuffer, bytesAvailable);
    samplesRead = bytesAvailable / 2; // Convert bytes to samples (16-bit)
  }
}

void sendAudioData() {
  // Check if we're connected and notifications are enabled
  if (Bluefruit.connected() && audioCharacteristic.notifyEnabled()) {
    // Send audio data in chunks
    for (int i = 0; i < samplesRead; i += BLE_PACKET_SIZE / 2) {
      // Calculate how many samples to send in this packet
      int samplesToSend = min(BLE_PACKET_SIZE / 2, samplesRead - i);
      
      // Prepare the packet
      uint8_t packet[BLE_PACKET_SIZE];
      
      // Copy audio samples to the packet (16-bit samples)
      for (int j = 0; j < samplesToSend; j++) {
        packet[j * 2] = sampleBuffer[i + j] & 0xFF;         // Low byte
        packet[j * 2 + 1] = (sampleBuffer[i + j] >> 8) & 0xFF; // High byte
      }
      
      // Send the packet
      if (audioCharacteristic.notify(packet, samplesToSend * 2)) {
        // Packet sent successfully
      } else {
        Serial.println("Failed to send audio packet");
        break; // Stop sending if there's an error
      }
      
      // Small delay to prevent overwhelming the BLE stack
      delay(5);
    }
  }
}
