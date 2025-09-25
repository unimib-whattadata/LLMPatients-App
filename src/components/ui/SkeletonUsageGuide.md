# Skeleton Components Usage Guide

This guide explains how to use the skeleton components to improve UX across the application.

## 🎯 **Available Skeleton Components**

### **Chat Skeletons** (`ChatSkeleton.tsx`)
- `ChatInterfaceSkeleton` - Complete chat interface skeleton
- `ChatHeaderSkeleton` - Chat header with session info
- `ChatMessageSkeleton` - Individual message skeleton
- `ChatInputSkeleton` - Message input area skeleton
- `PatientAvatarSkeleton` - Patient avatar skeleton
- `SessionTimerSkeleton` - Session timer skeleton

### **Page Skeletons** (`PageSkeleton.tsx`)
- `DashboardPageSkeleton` - Dashboard layout skeleton
- `PatientDetailSkeleton` - Patient detail page skeleton
- `TherapySessionTimelineSkeleton` - Therapy session timeline skeleton
- `AdminPageSkeleton` - Admin page skeleton
- `GenericPageSkeleton` - Customizable page skeleton

## 🚀 **Usage Examples**

### **1. Chat Interface**
```tsx
import { ChatInterfaceSkeleton } from "@/components/ui/ChatSkeleton";

// Complete chat loading state
if (isLoading) {
  return <ChatInterfaceSkeleton />;
}
```

### **2. Individual Chat Messages**
```tsx
import { ChatMessageSkeleton } from "@/components/ui/ChatSkeleton";

// Patient message skeleton
<ChatMessageSkeleton isUser={false} showAvatar={true} />

// User message skeleton
<ChatMessageSkeleton isUser={true} showAvatar={false} />
```

### **3. Dashboard Pages**
```tsx
import { DashboardPageSkeleton } from "@/components/ui/PageSkeleton";

// Dashboard loading state
if (isLoading) {
  return <DashboardPageSkeleton />;
}
```

### **4. Patient Detail Pages**
```tsx
import { PatientDetailSkeleton } from "@/components/ui/PageSkeleton";

// Patient detail loading state
if (patientLoading) {
  return <PatientDetailSkeleton />;
}
```

### **5. Generic Pages with Customization**
```tsx
import { GenericPageSkeleton } from "@/components/ui/PageSkeleton";

// Customizable page skeleton
<GenericPageSkeleton 
  showHeader={true}
  showMetrics={true}
  showContent={true}
  showTable={false}
/>
```

## 📍 **Where to Use These Skeletons**

### **Pages that can benefit from improved skeletons:**

1. **Dashboard** (`/dashboard/page.tsx`)
   - Use: `DashboardPageSkeleton`
   - Improves: Metrics loading, content sections

2. **Patient Details** (`/explore-patients/[patientId]/[patientName]/page.tsx`)
   - Use: `PatientDetailSkeleton`
   - Improves: Patient info loading, avatar loading

3. **Therapy Sessions** (`/dashboard/therapeutic-journey/[sessionId]/[patientName]/page.tsx`)
   - Use: `TherapySessionTimelineSkeleton`
   - Improves: Session timeline loading

4. **Admin Pages** (`/dashboard/admin/page.tsx`)
   - Use: `AdminPageSkeleton`
   - Improves: User management loading

5. **Chat Interface** (`/dashboard/therapeutic-journey/[sessionId]/[patientName]/chat/[stepId]/page.tsx`)
   - Use: `ChatInterfaceSkeleton` (already implemented)
   - Improves: Chat loading experience

## 🎨 **Customization Options**

### **ChatMessageSkeleton Props:**
- `isUser: boolean` - Whether it's a user or patient message
- `showAvatar: boolean` - Whether to show avatar skeleton

### **GenericPageSkeleton Props:**
- `showHeader: boolean` - Show page header skeleton
- `showMetrics: boolean` - Show metrics grid skeleton
- `showContent: boolean` - Show content sections skeleton
- `showTable: boolean` - Show table skeleton

## 🔧 **Implementation Steps**

1. **Import the skeleton component**
2. **Replace existing loading states**
3. **Test the loading experience**
4. **Customize if needed**

## 💡 **Best Practices**

1. **Use specific skeletons** for better UX (e.g., `ChatInterfaceSkeleton` instead of generic `LoadingSkeleton`)
2. **Match the skeleton to the actual content** structure
3. **Test loading states** to ensure they look realistic
4. **Keep skeletons lightweight** - avoid complex animations
5. **Use consistent styling** across all skeleton components

## 🚀 **Benefits**

- ✅ **Better perceived performance** - Users see structure immediately
- ✅ **Reduced layout shift** - Content appears in expected positions
- ✅ **Professional appearance** - Loading states look polished
- ✅ **Improved accessibility** - Screen readers can announce loading states
- ✅ **Consistent UX** - Same loading patterns across the app

## 📝 **Migration Checklist**

- [ ] Replace generic `LoadingSkeleton` with specific skeletons
- [ ] Test loading states in different scenarios
- [ ] Ensure skeletons match actual content structure
- [ ] Verify accessibility with screen readers
- [ ] Check responsive behavior
- [ ] Update documentation for new patterns
