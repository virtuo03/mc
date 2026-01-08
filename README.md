# 🍔 McRanking - Sistema Tracciamento Visite McDonald's

Un sito web per tenere traccia delle visite al McDonald's tra amici, con classifica e statistiche.

Come funziona :
La risposte vengono mandate tramite google forum e salvate su google sheet, poi si esporta in csv --> si trasforma in json con un qualsiasi sito online --> si copia incolla sovracrivendo su visits.json --> si runna update-data.js usando node update-data.js che trasforma automaticamente il file players.json --> si pusha le nuove modifiche --> fine

## 🚀 Funzionalità

- **Classifica Live**: Visualizza chi va più spesso al McDonald's
- **Carte Giocatore**: Ogni amico ha la sua scheda con statistiche
- **Statistiche Dettagliate**: Grafici e metriche sulle visite
- **Sistema Badge**: Riconoscimenti per record e abitudini
- **Podio**: I primi 3 classificati in evidenza
- **Design Responsive**: Funziona su telefono e computer

## 📋 Prerequisiti

1. **Google Account** (gratuito)
2. **GitHub Account** (gratuito)
3. **Google Sheet** con i dati delle visite
4. **Immagini Avatar** per ogni amico

## 🛠️ Installazione

### 1. Clona il repository
```bash
git clone https://github.com/tuo-username/mc.git
cd mc