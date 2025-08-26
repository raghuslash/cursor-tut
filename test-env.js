#!/usr/bin/env node

// Test script to verify .env file loading
const path = require('path');
const fs = require('fs');

console.log('🔍 Environment Configuration Test\n');

// Check current working directory
console.log(`📁 Current working directory: ${process.cwd()}`);

// Check for .env file
const envPath = path.join(process.cwd(), '.env');
console.log(`🔍 Looking for .env file at: ${envPath}`);

if (fs.existsSync(envPath)) {
    console.log('✅ .env file found!');
    
    // Read and display .env contents (without showing the actual API key)
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    console.log('\n📋 .env file contents:');
    lines.forEach((line, index) => {
        if (line.trim() && !line.startsWith('#')) {
            if (line.includes('OPENAI_API_KEY=')) {
                const key = line.split('=')[1];
                if (key && key !== 'your_openai_api_key_here') {
                    console.log(`   ${index + 1}: OPENAI_API_KEY=***${key.slice(-4)} (configured)`);
                } else {
                    console.log(`   ${index + 1}: ${line} (not configured)`);
                }
            } else {
                console.log(`   ${index + 1}: ${line}`);
            }
        }
    });
} else {
    console.log('❌ .env file not found!');
    console.log('\n💡 To create .env file:');
    console.log('   1. Copy env.example to .env: cp env.example .env');
    console.log('   2. Edit .env file and add your OpenAI API key');
}

// Load dotenv and check environment variables
console.log('\n🔧 Loading environment variables...');
require('dotenv').config({ path: envPath });

if (process.env.OPENAI_API_KEY) {
    const key = process.env.OPENAI_API_KEY;
    if (key === 'your_openai_api_key_here') {
        console.log('❌ OPENAI_API_KEY is still set to placeholder value');
    } else {
        console.log(`✅ OPENAI_API_KEY loaded: ***${key.slice(-4)}`);
    }
} else {
    console.log('❌ OPENAI_API_KEY not found in environment');
}

if (process.env.PORT) {
    console.log(`✅ PORT loaded: ${process.env.PORT}`);
} else {
    console.log('ℹ️  PORT not set (will use default 3000)');
}

console.log('\n🎯 Next steps:');
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    console.log('✅ Your .env file is properly configured!');
    console.log('🚀 You can now run: npm start');
} else {
    console.log('❌ Please configure your .env file first');
    console.log('   1. cp env.example .env');
    console.log('   2. Edit .env and add your actual OpenAI API key');
    console.log('   3. Run this test again: node test-env.js');
}
