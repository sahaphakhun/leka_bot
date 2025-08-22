/**
 * Test script to validate group name functionality
 * Run with: tsx src/scripts/testGroupNameFunctionality.ts
 */

// Mock the LINE Bot SDK for testing
const mockLineClient = {
  getGroupSummary: async (groupId: string) => {
    // Simulate LINE API responses
    if (groupId === 'test_group_with_api') {
      return { groupName: 'ทีมพัฒนาระบบ' };
    }
    throw new Error('getGroupSummary not available');
  }
};

/**
 * Simulate the getGroupInformation method logic
 */
async function testGetGroupInformation(groupId: string): Promise<{
  groupId: string;
  name: string;
  source: 'line_api' | 'fallback';
}> {
  try {
    console.log(`🔍 พยายามดึงข้อมูลกลุ่ม ${groupId} จาก LINE API`);
    
    // Try to use getGroupSummary if available
    try {
      if (typeof mockLineClient.getGroupSummary === 'function') {
        console.log('🆕 ใช้ getGroupSummary API');
        const groupSummary = await mockLineClient.getGroupSummary(groupId);
        if (groupSummary && groupSummary.groupName) {
          console.log(`✅ ดึงชื่อกลุ่มจาก LINE API: ${groupSummary.groupName}`);
          return {
            groupId,
            name: groupSummary.groupName,
            source: 'line_api'
          };
        }
      }
    } catch (summaryError: any) {
      console.log('ℹ️ getGroupSummary ไม่สามารถใช้ได้หรือไม่มีข้อมูล:', summaryError?.message || summaryError);
    }
    
    console.log('ℹ️ ไม่สามารถดึงชื่อกลุ่มจาก LINE API ได้ ใช้ชื่อเริ่มต้น');
    
    // Fallback: Use improved default name
    const shortId = groupId.length > 8 ? groupId.substring(0, 8) : groupId;
    return {
      groupId,
      name: `กลุ่ม ${shortId}`,
      source: 'fallback'
    };
    
  } catch (error) {
    console.error('❌ Failed to get group information:', error);
    
    // Final fallback
    const shortId = groupId.length > 8 ? groupId.substring(0, 8) : groupId;
    return {
      groupId,
      name: `กลุ่ม ${shortId}`,
      source: 'fallback'
    };
  }
}

/**
 * Test scenarios
 */
async function runTests() {
  console.log('🧪 Testing Group Name Functionality\n');

  const testCases = [
    {
      name: 'Group with LINE API support',
      groupId: 'test_group_with_api',
      expectedSource: 'line_api',
      expectedName: 'ทีมพัฒนาระบบ'
    },
    {
      name: 'Group without LINE API support (long ID)',
      groupId: 'C1234567890abcdef1234567890abcdef',
      expectedSource: 'fallback',
      expectedName: 'กลุ่ม C1234567'
    },
    {
      name: 'Group without LINE API support (short ID)',
      groupId: 'C123',
      expectedSource: 'fallback',
      expectedName: 'กลุ่ม C123'
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    try {
      const result = await testGetGroupInformation(testCase.groupId);
      
      const sourceMatch = result.source === testCase.expectedSource;
      const nameMatch = result.name === testCase.expectedName;
      
      if (sourceMatch && nameMatch) {
        console.log(`✅ PASS: Got "${result.name}" from ${result.source}`);
      } else {
        console.log(`❌ FAIL: Expected "${testCase.expectedName}" from ${testCase.expectedSource}, got "${result.name}" from ${result.source}`);
      }
    } catch (error) {
      console.error(`❌ ERROR: ${error}`);
    }
    console.log('');
  }
}

/**
 * Test placeholder detection logic
 */
function testPlaceholderDetection() {
  console.log('🧪 Testing Placeholder Detection\n');

  const testNames = [
    { name: 'กลุ่ม C1234567', isPlaceholder: true },
    { name: 'กลุ่ม C1234567890abcdef', isPlaceholder: true },
    { name: 'ทีมพัฒนาระบบ', isPlaceholder: false },
    { name: 'LINE Group Thailand', isPlaceholder: false },
    { name: '[INACTIVE] 2024-01-01T00:00:00.000Z', isPlaceholder: true },
    { name: 'Group C123', isPlaceholder: true },
    { name: 'แชทส่วนตัว', isPlaceholder: true },
    { name: 'personal_user123', isPlaceholder: true }
  ];

  function isPlaceholderName(name: string): boolean {
    const placeholderPatterns = [
      /^กลุ่ม [A-Za-z0-9]{1,8}$/,
      /^กลุ่ม [A-Za-z0-9]{8,}$/,
      /^\[INACTIVE\]/,
      /^Group /,
      /^แชทส่วนตัว$/,
      /^personal_/
    ];

    return placeholderPatterns.some(pattern => pattern.test(name));
  }

  for (const test of testNames) {
    const result = isPlaceholderName(test.name);
    const status = result === test.isPlaceholder ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: "${test.name}" → ${result ? 'Placeholder' : 'Real name'}`);
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🚀 Group Name Functionality Test Suite\n');
  console.log('=' .repeat(50));
  
  await runTests();
  
  console.log('=' .repeat(50));
  testPlaceholderDetection();
  
  console.log('\n✅ All tests completed!');
}

// Run tests
if (require.main === module) {
  main().catch(console.error);
}

export { testGetGroupInformation };