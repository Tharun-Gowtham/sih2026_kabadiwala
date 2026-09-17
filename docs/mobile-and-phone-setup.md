# Running Kabadiwala Connect on Other Computers & Phones

This guide provides step-by-step instructions to set up, launch, and test **Kabadiwala Connect** on another computer (Windows, macOS, Linux) and access the mobile apps directly on **real physical smartphones (Android and iOS)** over your local Wi-Fi network.

---

## 1. Running on Another Computer

### Step A: Prerequisites
Make sure the computer has:
1. **Node.js**: v18.0.0 or higher (`node -v`)
2. **Python**: v3.10 or higher (`python --version`)
3. **Git**: (`git --version`)

### Step B: Clone & Setup Dependencies
Open your terminal (PowerShell, Command Prompt, or Bash):

```bash
# 1. Clone repository (or copy project folder)
git clone <YOUR_REPO_URL>
cd sih2026_kabadiwala

# 2. Setup Python Backend Virtual Environment
cd backend
python -m venv venv

# Windows activate:
venv\Scripts\activate
# macOS/Linux activate:
# source venv/bin/activate

pip install -r requirements.txt

# 3. Setup Mobile App
cd ../mobile
npm install

# 4. Setup Recycler Dashboard Frontend
cd ../recycler-dashboard-frontend
npm install
```

### Step C: Launch the 3 Servers
You will run 3 processes (in separate terminal windows or tabs):

| Process | Directory | Command | URL |
| :--- | :--- | :--- | :--- |
| **1. FastAPI Backend** | `backend/` | `python run.py` | `http://localhost:8000` |
| **2. Mobile App (Collector & Dealer)** | `mobile/` | `npm run dev` | `http://localhost:5173` |
| **3. Recycler Web Portal** | `recycler-dashboard-frontend/` | `npm run dev` | `http://localhost:5174` |

---

## 2. Connecting & Running on Real Mobile Phones (Android & iOS)

To test the mobile app on a real smartphone without installing any software or app store builds:

### Step 1: Connect Both Devices to the Same Wi-Fi
Ensure your host computer and your smartphone are connected to the **same Wi-Fi network** (or phone mobile hotspot).

### Step 2: Find Your Host Computer's Local IP Address
In your computer's terminal:
- **Windows**:
  ```powershell
  ipconfig
  ```
  *Look for `IPv4 Address` under your active Wi-Fi adapter (e.g. `192.168.1.15` or `192.168.29.145`).*
- **macOS / Linux**:
  ```bash
  ifconfig -a | grep "inet "
  # or
  ip -br a
  ```
  *Look for your local IP starting with `192.168.x.x` or `10.0.x.x`.*

### Step 3: Open the App in Your Phone's Browser
On your smartphone, open **Chrome** (recommended on Android) or **Safari** (iOS):

1. **For Doorstep Collector (*Kabadiwala Lite*)**:
   ```
   http://<YOUR_COMPUTER_IP>:5173/kabadiwala-lite.html
   ```
   *Example: `http://192.168.1.15:5173/kabadiwala-lite.html`*

2. **For Scrap Dealer Hub**:
   ```
   http://<YOUR_COMPUTER_IP>:5173/dealer.html
   ```
   *Example: `http://192.168.1.15:5173/dealer.html`*

3. **For Recycler Dashboard** (if testing on tablet / phone):
   ```
   http://<YOUR_COMPUTER_IP>:5174/
   ```

---

## 3. Installing as a Native PWA App on Android

1. Open `http://<YOUR_COMPUTER_IP>:5173/kabadiwala-lite.html` in **Google Chrome** on your Android phone.
2. An **"📲 Install App"** banner will automatically appear at the top, or tap the three dots **(⋮)** in Chrome and select **"Install app"** or **"Add to Home screen"**.
3. Confirm the prompt.
4. An app icon named **Kabadiwala** will appear on your phone's home screen.
5. Tap the icon to launch the app in **true standalone mode** (without any browser URL bar or navigation buttons), exactly like a native app installed from Google Play!

---

## 4. Testing Real Hardware Features on Phone

### A. Camera & On-Device ML Photo Identification
1. On the **Scanner** tab of *Kabadiwala Lite*, tap **"📷 Take Scrap Photo"**.
2. When prompted by Android, grant **Camera** access.
3. Snap a photo of a scrap item (e.g., an electronic board, phone cable, or battery).
4. The on-device classifier immediately identifies the material category (e.g., `PCB`, `Cable`, `Battery`) with confidence metrics.

### B. Live Geolocation (GPS) Stamping
1. Tap the top GPS indicator (or proceed to generate a digital scrap slip).
2. When prompted, tap **"Allow"** for location access.
3. The app acquires your device's live latitude and longitude and automatically stamps the digital scrap slip.

### C. 8-Language Vernacular Audio (Low-Literacy Support)
1. Tap the top language picker button (🇮🇳).
2. Select any of the 8 supported languages: **Hindi (हिंदी)**, **English**, **Bengali (বাংলা)**, **Telugu (తెలుగు)**, **Tamil (தமிழ்)**, **Marathi (मराठी)**, **Gujarati (ગુજરાતી)**, or **Kannada (ಕನ್ನಡ)**.
3. Enter scrap weight and tap the **"🔊 Listen / सुनें"** button.
4. Your phone's native speech synthesizer (Text-to-Speech) will read out the calculated earnings in the selected language!

### D. Offline Resilience Test (Airplane Mode)
1. Turn ON **Airplane Mode** on your phone (disconnect all Wi-Fi and Cellular data).
2. Open *Kabadiwala Lite* or the *Dealer App*.
3. Notice that the entire UI loads instantly from cache (via the Service Worker).
4. Snap scrap photos, record scrap slips, or log dealer purchases in the offline queue.
5. Turn Airplane Mode OFF: all queued records synchronize automatically without duplicates.

---

## 5. Troubleshooting Network & Firewall Issues

If your phone displays *"This site can't be reached"* when entering `http://<YOUR_COMPUTER_IP>:5173`:

1. **Windows Defender Firewall**:
   - Windows often blocks inbound connections on private networks.
   - Open PowerShell as Administrator and run:
     ```powershell
     New-NetFirewallRule -DisplayName "Kabadiwala Dev Ports" -Direction Inbound -LocalPort 5173,5174,8000 -Protocol TCP -Action Allow
     ```
   - Alternatively, temporarily set your Wi-Fi network profile to **Private** in Windows Settings.

2. **Check Router "AP Isolation"**:
   - Some university, office, or public Wi-Fi networks enable "Client Isolation" which blocks devices on the same Wi-Fi from talking to each other.
   - *Fix*: Turn on a Mobile Hotspot from your phone, connect your computer to that hotspot, and use the hotspot gateway IP.
