# Firewalld

> View firewalld active zone, open ports, services and rich rules

## 🎯 Features

- View every active firewalld zone and the interfaces bound to it
- Browse all configured zones, not just the active ones
- Drill into a zone's services, ports, protocols, forward ports and rich rules
- Add or remove ports and services, with optional persistence across reboot
- Move an interface to a different zone, or set a zone as the default
- Toggle firewalld panic mode (blocks all traffic instantly)
- Enable traffic logging and tail dropped/rejected packets from the kernel log

## 🚀 Getting Started

## Prerequisites

- [Node.js](https://nodejs.org/) (recommended version 24 or higher)
- [firewalld](https://firewalld.org/) installed and running on the system

### Installation

This extension is not yet published to the Vicinae Store. Install it by building from source below.

### Build From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/brpaz/vicinae-firewalld.git
2. Navigate to the project directory:
   ```bash
   cd firewalld
3. Install dependencies:
   ```bash
   npm i
4. Build the project:
   ```bash
   npm run build
   ```

This will install the extension in `~/.local/share/vicinae/extensions`, and will be available immediately on your Vicinae app.

## Development

In development, you can use the following command to watch for changes and rebuild your extension automatically:

```bash
npm run dev
```

## 🧰 Usage

The extension adds four commands to Vicinae:

- **Firewall Zones** — active zones, their interfaces, open ports/services/rules
- **All Firewall Zones** — every configured zone, including inactive ones
- **Firewall Traffic Log** — recent traffic dropped or rejected by firewalld
- **Toggle Panic Mode** — instantly block or unblock all network traffic (bind it to a hotkey)

From a zone, drill in to view/add/remove ports and services, move an interface into that zone, or set it as the default zone.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.