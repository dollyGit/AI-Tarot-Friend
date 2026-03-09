# AI Tarot Friend - Running Application Guide

**Status**: ✅ **FULLY OPERATIONAL**

---

## 🎉 What's Running

- ✅ **PostgreSQL**: localhost:5432 (with 78 tarot cards seeded)
- ✅ **Redis**: localhost:6379
- ✅ **Backend API**: http://localhost:3000
- ✅ **Frontend Web**: http://localhost:3001

---

## 🚀 Quick Start

### 1. Open the Application

Open your browser and navigate to:
```
http://localhost:3001
```

### 2. Set Up Authentication

Since we don't have login pages yet, you need to manually set the auth token:

1. **Open browser console** (F12 or Cmd+Option+I on Mac)

2. **Paste this command** in the console:
```javascript
localStorage.setItem('auth_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3N2MyYjZkZC0xMDc4LTQ1MDItYmQ5Zi0zY2YwNjI2ODRjMDEiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzYwMDA3MjQwLCJleHAiOjE3NjA2MTIwNDAsImlzcyI6ImFpLXRhcm90LWJhY2tlbmQiLCJzdWIiOiI3N2MyYjZkZC0xMDc4LTQ1MDItYmQ5Zi0zY2YwNjI2ODRjMDEifQ.5ugLUJPnPlGtpTbqgq-PqwIlvveXgzbQFJm3zQJfCtM')
```

3. **Refresh the page** (F5 or Cmd+R)

### 3. Use the Application

Now you can use the full reading flow:

1. **Click "Start Your Reading"** on the home page
2. **Enter your concern** - Type what's on your mind (e.g., "I'm worried about my career change")
3. **Choose a spread**:
   - **1-Card** - Quick focused guidance
   - **3-Card** - Past, Present, Future (recommended for first try!)
   - **7-Card** - Comprehensive insight (requires premium)
   - **Celtic Cross** - Deep analysis (requires premium)
4. **View your cards** - Watch them flip and reveal
5. **Read interpretation** - See TL;DR, key points, and advice

---

## 🧪 Test User Details

```
Email: test@example.com
Display Name: Test User
User ID: 77c2b6dd-1078-4502-bd9f-3cf062684c01
```

---

## 🔍 Testing Different Features

### Crisis Detection
Try entering:
```
"I feel hopeless and don't know what to do anymore"
```
You should see a crisis modal with mental health resources.

### Sentiment Analysis
The app analyzes your input sentiment:
- Positive: "I'm excited about new opportunities"
- Neutral: "I'm considering changing jobs"
- Negative: "I'm worried about my future"

### Different Spreads
- **1-Card**: Fastest, single insight
- **3-Card**: Shows past, present, future
- **7-Card** & **Celtic Cross**: Premium only (will show error without subscription)

---

## 📊 Backend API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

### Create Session
```bash
curl -X POST http://localhost:3000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"channel": "web", "user_input": "I need guidance"}'
```

### Create Reading
```bash
curl -X POST http://localhost:3000/api/v1/readings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "session_id": "SESSION_ID",
    "spread_type": "3-card",
    "context": "Career guidance"
  }'
```

---

## 🛠️ Stopping the Servers

### Stop Backend
```bash
# Find the process
lsof -ti:3000 | xargs kill -9

# Or use Ctrl+C if running in foreground
```

### Stop Frontend
```bash
# Find the process
lsof -ti:3001 | xargs kill -9

# Or use Ctrl+C if running in foreground
```

### Stop Docker Services
```bash
docker-compose down
```

---

## 🔄 Restarting Everything

If you need to restart:

```bash
# 1. Start databases
docker-compose up -d postgres redis

# 2. Start backend (from root directory)
cd backend
npm run dev

# 3. Start frontend (from root directory in new terminal)
cd frontend
npm run dev
```

---

## 📁 Project Structure

```
http://localhost:3001/          # Home page
http://localhost:3001/reading   # Reading flow page

http://localhost:3000/health    # Backend health check
http://localhost:3000/api/v1/*  # Backend API endpoints
```

---

## 🎨 What You'll See

### Home Page
- Purple gradient hero
- "Start Your Reading" button
- Feature highlights

### Reading Flow
1. **Input Stage**: Chat-like input for your concern
2. **Spread Selection**: 4 beautiful spread option cards
3. **Drawing Stage**: Loading animation while cards are drawn
4. **Complete Stage**:
   - Cards displayed in spread formation
   - 3D flip animations
   - Interpretation with TL;DR
   - Key points numbered list
   - Expandable advice (short/medium/long term)
   - Warnings section

### Crisis Modal (if triggered)
- Mental health hotlines
- Click-to-call phone numbers
- Web resources link
- Professional care disclaimer

---

## 🐛 Troubleshooting

### "Network Error" or API not responding
- Check backend is running: `curl http://localhost:3000/health`
- Verify auth token is set in localStorage
- Check browser console for errors

### "Unauthorized" or "403 Forbidden"
- Make sure you set the auth token in localStorage
- Token expires in 7 days - regenerate if needed

### Cards not showing
- Check browser console for errors
- Verify database has cards: `docker exec -it tarot-reading-postgres psql -U postgres -d tarot_dev -c "SELECT COUNT(*) FROM cards;"`
- Should return 78

### Premium spreads showing error
- This is expected! 7-card and Celtic Cross require a subscription
- To test, you'd need to create a subscription record in the database

---

## 🎯 Next Steps

1. **Try the reading flow** - Test all spread types
2. **Test crisis detection** - Enter concerning text
3. **Explore the UI** - Check animations and interactions
4. **Test API directly** - Use curl commands
5. **View database** - Use Prisma Studio: `npx prisma studio`

---

## 🎉 Congratulations!

You have a fully functional AI Tarot Friend MVP running locally:
- ✅ Full-stack application
- ✅ Database with 78 tarot cards
- ✅ Beautiful React UI with animations
- ✅ Sentiment analysis
- ✅ Crisis detection
- ✅ Multiple spread types
- ✅ Interpretation generation (mock mode)

**Enjoy exploring your tarot reading app!** 🔮✨
