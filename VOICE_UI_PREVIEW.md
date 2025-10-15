# Voice Panel UI Preview

## Location
The voice panel is located on the right side of the screen, below the chat panel.

## Visual Layout

```
┌─────────────────────────────────┐
│  🎙️ 语音                         │
├─────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐ │
│  │ 加入全局    │  │ 离开频道    │ │
│  └────────────┘  └────────────┘ │
│  ┌────────────┐  ┌────────────┐ │
│  │ 静音        │  │ 免打扰      │ │
│  └────────────┘  └────────────┘ │
├─────────────────────────────────┤
│        🎤 🔊 全局频道            │
├─────────────────────────────────┤
│  成员:                           │
│  🎤🔊 Player1                    │
│  🔇🔊 Player2                    │
│  🎤🔈 Player3                    │
└─────────────────────────────────┘
```

## Button States

### Not Connected
```
┌─────────────────────────────────┐
│  🎙️ 语音                         │
├─────────────────────────────────┤
│  [加入全局]  [离开频道]          │
│  [  静音  ]  [ 免打扰 ]          │
├─────────────────────────────────┤
│        未连接                    │
└─────────────────────────────────┘
```

### Connected - Unmuted
```
┌─────────────────────────────────┐
│  🎙️ 语音                         │
├─────────────────────────────────┤
│  [加入全局]  [离开频道]          │
│  [  静音  ]  [ 免打扰 ]          │
├─────────────────────────────────┤
│     🎤 🔊 全局频道               │
├─────────────────────────────────┤
│  成员:                           │
│  🎤🔊 Player123                  │
│  🎤🔊 Player456                  │
└─────────────────────────────────┘
```

### Connected - Muted
```
┌─────────────────────────────────┐
│  🎙️ 语音                         │
├─────────────────────────────────┤
│  [加入全局]  [离开频道]          │
│  [  静音  ]  [ 免打扰 ]          │
├─────────────────────────────────┤
│     🔇 🔊 全局频道               │
├─────────────────────────────────┤
│  成员:                           │
│  🔇🔊 Player123 (你)             │
│  🎤🔊 Player456                  │
└─────────────────────────────────┘
```

### Connected - Deafened
```
┌─────────────────────────────────┐
│  🎙️ 语音                         │
├─────────────────────────────────┤
│  [加入全局]  [离开频道]          │
│  [  静音  ]  [ 免打扰 ]          │
├─────────────────────────────────┤
│     🎤 🔈 全局频道               │
├─────────────────────────────────┤
│  成员:                           │
│  🎤🔈 Player123 (你)             │
│  🎤🔊 Player456                  │
└─────────────────────────────────┘
```

## Icon Legend

### Status Icons
- 🎤 = Microphone **ON** (unmuted)
- 🔇 = Microphone **OFF** (muted)
- 🔊 = Hearing others (not deafened)
- 🔈 = **NOT** hearing others (deafened)

### Combined States
- 🎤🔊 = Normal (can speak and hear)
- 🔇🔊 = Muted (can hear but not speak)
- 🎤🔈 = Deafened (can speak but not hear - mutes self too)
- 🔇🔈 = Muted & Deafened (cannot speak or hear)

## Panel Styling

### Colors
- Background: Dark grey with transparency (rgba(30, 30, 30, 0.95))
- Buttons: Dark grey (#333) with hover effect (#444)
- Status box: Very dark grey with border
- Text: White (#fff) / Light grey (#ccc)

### Layout
- Width: Fits in side panel (~320px)
- Button grid: 2x2 layout
- Status section: Centered text
- Member list: Scrollable (max 100px height)

## Integration with Main UI

The voice panel appears alongside other UI panels:
```
Right Side Panel Layout:
┌─────────────────┐
│ 控制说明         │  ← Controls panel
├─────────────────┤
│ 玩家状态         │  ← Player stats
├─────────────────┤
│ 技能             │  ← Skills
├─────────────────┤
│ 任务             │  ← Quests
├─────────────────┤
│ 成就             │  ← Achievements
├─────────────────┤
│ 排行榜           │  ← Leaderboard
├─────────────────┤
│ 聊天             │  ← Chat
├─────────────────┤
│ 🎙️ 语音         │  ← Voice (NEW!)
└─────────────────┘
```

## Responsive Behavior

- Buttons resize to fit panel width
- Member list scrolls if more than ~5 members
- Status text truncates if too long
- All text and buttons are clickable/tappable

## Accessibility

- Clear visual feedback on hover
- Status icons provide visual state
- Text alternatives for icons
- Keyboard accessible (tab navigation)
- Click handlers on all interactive elements

## Usage Flow

1. User clicks "加入全局" → Browser requests mic permission
2. User grants permission → Status changes to "🎤 🔊 全局频道"
3. Member joins → Appears in member list
4. User clicks "静音" → Icon changes to "🔇"
5. User clicks "免打扰" → Icon changes to "🔈"
6. User clicks "离开频道" → Status returns to "未连接"

## Test Page Comparison

The test page (`voice-test.html`) has additional features:
- "Create Team Channel" button
- Debug log section
- More detailed status information
- Connection state monitoring
- Explicit connect/disconnect buttons

The main client focuses on essential features for in-game use.
