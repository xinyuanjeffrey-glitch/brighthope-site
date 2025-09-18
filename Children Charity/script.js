// ===== CONFIGURATION =====
const DONATION_WALLET = "0xEE83d2EFDfa5821EF8Cd2f6bCCCDddbFFF30514a"; // your wallet

// USDT contract addresses per network
const USDT_CONTRACTS = {
  ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // Ethereum Mainnet
  bsc: "0x55d398326f99059fF775485246999027B3197955",     // Binance Smart Chain
  polygon: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"  // Polygon
};

// Network chain IDs
const NETWORK_PARAMS = {
  ethereum: { chainId: "0x1" }, // Ethereum Mainnet
  bsc: { chainId: "0x38" },     // Binance Smart Chain
  polygon: { chainId: "0x89" }  // Polygon
};

let currentNetwork = "ethereum"; // default 

// Year
document.getElementById('year').textContent = new Date().getFullYear();

// Mobile menu toggle
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger?.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', open);
});

// Donate modal open/close
const donateModal = document.getElementById('donateModal');
function openDonateModal() {
  if (!donateModal.open) donateModal.showModal();
}
document.getElementById('donateOpen')?.addEventListener('click', openDonateModal);
document.getElementById('donateOpenMobile')?.addEventListener('click', openDonateModal);
document.getElementById('donateOpenHero')?.addEventListener('click', openDonateModal);
document.getElementById('donateOpenBand')?.addEventListener('click', openDonateModal);
document.getElementById('donateClose')?.addEventListener('click', ()=> donateModal.close());

// Donation logic
let selectedAmount = 5; // default

document.querySelectorAll('.amounts button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.amounts button').forEach(b => b.removeAttribute('aria-pressed'));
    btn.setAttribute('aria-pressed','true');
    selectedAmount = Number(btn.dataset.amount);
    document.getElementById('otherAmount').value = "";
  });
});

document.getElementById('otherAmount').addEventListener('input', (e) => {
  selectedAmount = Number(e.target.value);
  document.querySelectorAll('.amounts button').forEach(b => b.removeAttribute('aria-pressed'));
});

document.getElementById('copyWallet')?.addEventListener('click', async () => {
  try {
    const addr = document.getElementById('usdtWallet').textContent.trim();
    await navigator.clipboard.writeText(addr);
    document.getElementById('copyWallet').textContent = "Copied!";
    setTimeout(() => document.getElementById('copyWallet').textContent = "Copy Wallet Address", 1500);
  } catch(e) {
    alert("Copy failed. Please copy manually.");
  }
});

// Show network selector only when USDT is chosen
function updateNetworkBox() {
  const method = document.querySelector('input[name="payMethod"]:checked').value;
  document.getElementById('networkBox').style.display = method === "usdt" ? "block" : "none";
}
document.querySelectorAll('input[name="payMethod"]').forEach(radio => {
  radio.addEventListener('change', updateNetworkBox);
});
updateNetworkBox();

// Update network when user selects it
document.getElementById('networkSelect').addEventListener('change', async (e) => {
  currentNetwork = e.target.value;
  if (typeof window.ethereum !== "undefined") {
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [NETWORK_PARAMS[currentNetwork]]
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        alert("Please add this network manually in MetaMask.");
      } else {
        console.error(switchError);
      }
    }
  }
});

// Auto-detect MetaMask network
async function detectNetwork() {
  if (typeof window.ethereum !== "undefined") {
    try {
      const chainId = await ethereum.request({ method: 'eth_chainId' });
      for (const [name, params] of Object.entries(NETWORK_PARAMS)) {
        if (params.chainId.toLowerCase() === chainId.toLowerCase()) {
          currentNetwork = name;
          document.getElementById('networkSelect').value = name;
        }
      }
    } catch (err) {
      console.error("Network detection failed:", err);
    }
  }
}

// Run detection on load
detectNetwork();

// Detect network changes in MetaMask
if (typeof window.ethereum !== "undefined") {
  ethereum.on('chainChanged', () => {
    detectNetwork();
  });
} else {
  // Show banner if MetaMask is not installed
  const modalContent = document.querySelector('#donateModal .content');
  const warning = document.createElement('div');
  warning.style.background = '#fff3cd';
  warning.style.border = '1px solid #ffeeba';
  warning.style.padding = '0.8rem';
  warning.style.marginTop = '1rem';
  warning.style.borderRadius = '8px';
  warning.style.color = '#856404';
  warning.innerHTML = `⚠️ MetaMask not detected. <a href="https://metamask.io/download/" target="_blank" style="color:#0b5072;font-weight:600">Install MetaMask</a> to donate using crypto.`;
  modalContent.appendChild(warning);
}

function showThankYou(amount, method) {
  const thankYouModal = document.getElementById('thankYouModal');
  const msg = document.getElementById('thankYouMsg');
  msg.textContent = `Thank you for donating $${amount} via ${method}!`;
  thankYouModal.showModal();
}

document.getElementById('thankYouClose').addEventListener('click', () => {
  document.getElementById('thankYouModal').close();
});

// Helper: clear duplicate QR boxes
function clearCryptoBox() {
  const cryptoBox = document.getElementById('cryptoBox');
  [...cryptoBox.querySelectorAll('div.dynamic-qr')].forEach(el => el.remove());
}

// ---------------- PAYMENT HANDLER ----------------
document.getElementById('donateNow').addEventListener('click', async () => {
  if (!selectedAmount || selectedAmount < 1) {
    alert("Please enter a valid amount.");
    return;
  }

  const method = document.querySelector('input[name="payMethod"]:checked').value;

  document.getElementById('paypalBox').classList.add("hidden");
  document.getElementById('cryptoBox').classList.add("hidden");

  if (method === "paypal") {
    document.getElementById('paypalBox').classList.remove("hidden");

    if (window.paypal && !document.querySelector('#paypal-button-container iframe')) {
      document.getElementById("paypal-button-container").innerHTML = "";
      paypal.Buttons({
        createOrder: function(data, actions) {
          return actions.order.create({
            purchase_units: [{ amount: { value: selectedAmount.toString() } }]
          });
        },
        onApprove: function(data, actions) {
          return actions.order.capture().then(function(details) {
            showThankYou(selectedAmount, "PayPal");
          });
        }
      }).render('#paypal-button-container');
    }
  } 
  else if (method === "usdt") {
    document.getElementById('cryptoBox').classList.remove("hidden");

    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        const usdtContract = USDT_CONTRACTS[currentNetwork];
        const decimals = 6;
        const amountInUSDT = (selectedAmount * (10 ** decimals)).toString();

        const abi = [{
          "constant": false,
          "inputs": [
            { "name": "_to", "type": "address" },
            { "name": "_value", "type": "uint256" }
          ],
          "name": "transfer",
          "outputs": [{ "name": "", "type": "bool" }],
          "type": "function"
        }];

        const iface = new ethers.utils.Interface(abi);
        const data = iface.encodeFunctionData("transfer", [DONATION_WALLET, amountInUSDT]);

        await ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: accounts[0],
            to: usdtContract,
            data: data
          }]
        });

        showThankYou(selectedAmount, `USDT (${currentNetwork})`);
      } catch (err) {
        alert("USDT transaction failed: " + err.message);
      }
    } else {
      // If MetaMask not detected, show QR for manual transfer with network + contract info
      document.getElementById('cryptoBox').classList.remove("hidden");
      clearCryptoBox();
      const qrContainer = document.createElement('div');
      qrContainer.classList.add("dynamic-qr");
      qrContainer.style.marginTop = '1rem';
      const qrId = `usdtQR_${currentNetwork}`;
      qrContainer.innerHTML = `<p class="note">Scan to send USDT on <strong>${currentNetwork.toUpperCase()}</strong>:</p><canvas id="${qrId}"></canvas><p class="note small">USDT Contract: ${USDT_CONTRACTS[currentNetwork]}</p>`;
      document.getElementById('cryptoBox').appendChild(qrContainer);

      if (window.QRCode) {
        const qrData = `network:${currentNetwork};contract:${USDT_CONTRACTS[currentNetwork]};recipient:${DONATION_WALLET}`;
        QRCode.toCanvas(document.getElementById(qrId), qrData, function (error) {
          if (error) console.error(error);
        });
      }
    }
  }
  else if (method === "metamask") {
    document.getElementById('cryptoBox').classList.remove("hidden");

    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        await ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: accounts[0],
            to: DONATION_WALLET,
            value: "0x" + BigInt(Math.floor(selectedAmount * 1e18)).toString(16)
          }]
        });
        showThankYou(selectedAmount, "MetaMask (ETH)");
      } catch (err) {
        alert("MetaMask transaction failed: " + err.message);
      }
    } else {
      alert("MetaMask not detected!");
    }
  }
});

// ---------------- GOOGLE TRANSLATE ----------------
function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    autoDisplay: false
  }, 'google_translate_element');

  const userLang = navigator.language || navigator.userLanguage;
  let retryCount = 0;
  const tryAutoTranslate = () => {
    const iframe = document.querySelector("iframe.goog-te-menu-frame");
    if (!iframe) {
      if (retryCount++ < 10) setTimeout(tryAutoTranslate, 500);
      return;
    }
    const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
    let targetLang;
    if (userLang.startsWith("fil") || userLang.startsWith("tl")) targetLang = "Filipino";
    else if (userLang.startsWith("es")) targetLang = "Spanish";
    else if (userLang.startsWith("fr")) targetLang = "French";

    if (targetLang) {
      const option = [...innerDoc.querySelectorAll("span.text")].find(el => el.innerText.includes(targetLang));
      if (option) option.click();
    }
  };
  tryAutoTranslate();
}

const languages = [
  { code: "EN", name: "English" },
  { code: "FIL", name: "Filipino" },
  { code: "ES", name: "Spanish" },
  { code: "FR", name: "French" }
];

let currentLangIndex = 0;

function switchLanguage() {
  const iframe = document.querySelector("iframe.goog-te-menu-frame");
  if (!iframe) {
    setTimeout(switchLanguage, 500);
    return;
  }

  const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
  currentLangIndex = (currentLangIndex + 1) % languages.length;
  const targetLang = languages[currentLangIndex];

  const option = [...innerDoc.querySelectorAll("span.text")].find(el => el.innerText.includes(targetLang.name));
  if (option) {
    option.click();
    document.getElementById("langIndicator").textContent = targetLang.code;
  }
}

document.getElementById("translateBtn")?.addEventListener("click", switchLanguage);