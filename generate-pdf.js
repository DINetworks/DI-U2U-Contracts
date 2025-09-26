const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// PDF generation script for IU2U documentation
async function generatePDF() {
    // Dynamic import for marked (ESM module)
    const { marked } = await import('marked');
    console.log('Starting PDF generation...');
    
    try {
        // Read essential markdown files for concise documentation
        const docsPath = path.join(__dirname, 'docs');
        const files = [
            // Core Overview
            'README.md',
            'core-concepts/protocol-overview.md',
            'core-concepts/iu2u-token.md',

            // System Components
            'metatx/overview.md',
            'core-concepts/cross-chain-architecture.md',
            'dex-aggregation/overview.md',

            // Key Features
            'metatx/metatxgateway.md',
            'metatx/gascreditvault.md',
            'cross-chain/token-transfers.md',
            'dex-aggregation/supported-dexes.md',

            // Technical Details
            'core-concepts/relayer-network.md',
            'core-concepts/security-model.md',
            'api-reference/iu2u-gateway.md',

            // Getting Started
            'getting-started/quick-start.md',
            'getting-started/installation.md',
            'guides/integration.md'
        ];
        
        let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>IU2U Technical Documentation</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Georgia:wght@400;700&display=swap');

                body {
                    font-family: 'Georgia', serif;
                    line-height: 1.7;
                    color: #2c3e50;
                    max-width: 820px;
                    margin: 0 auto;
                    padding: 30px;
                    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
                    box-shadow: 0 0 20px rgba(0,0,0,0.1);
                }

                h1 {
                    color: #1a365d;
                    border-bottom: 4px solid #3182ce;
                    padding-bottom: 15px;
                    margin-top: 50px;
                    font-size: 2.2em;
                    font-weight: 700;
                    letter-spacing: -0.02em;
                    page-break-before: always;
                }

                h1:first-child {
                    page-break-before: auto;
                    margin-top: 0;
                }

                h2 {
                    color: #2d3748;
                    border-bottom: 3px solid #e2e8f0;
                    padding-bottom: 8px;
                    margin-top: 40px;
                    font-size: 1.6em;
                    font-weight: 600;
                }

                h3 {
                    color: #4a5568;
                    margin-top: 30px;
                    font-size: 1.3em;
                    font-weight: 600;
                }

                h4 {
                    color: #718096;
                    margin-top: 25px;
                    font-size: 1.1em;
                    font-weight: 500;
                }

                code {
                    background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
                    padding: 3px 6px;
                    border-radius: 6px;
                    font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
                    font-size: 0.85em;
                    color: #e53e3e;
                }

                pre {
                    background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
                    border: none;
                    border-radius: 12px;
                    padding: 20px;
                    overflow-x: auto;
                    margin: 20px 0;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    position: relative;
                }
                
                pre code {
                    background: none;
                    padding: 0;
                    color: #e2e8f0;
                    font-size: 0.9em;
                }

                blockquote {
                    border-left: 5px solid #3182ce;
                    margin: 25px 0;
                    padding: 15px 20px;
                    background: linear-gradient(135deg, #ebf8ff 0%, #bee3f8 100%);
                    border-radius: 0 8px 8px 0;
                    color: #2c5282;
                    font-style: italic;
                    position: relative;
                }

                blockquote::before {
                    content: '"';
                    font-size: 4em;
                    color: #3182ce;
                    position: absolute;
                    top: -10px;
                    left: 10px;
                    opacity: 0.3;
                }

                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 25px 0;
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                table th,
                table td {
                    border: 1px solid #e2e8f0;
                    padding: 12px 16px;
                    text-align: left;
                }

                table th {
                    background: linear-gradient(135deg, #3182ce 0%, #2c5282 100%);
                    color: white;
                    font-weight: 600;
                    text-transform: uppercase;
                    font-size: 0.85em;
                    letter-spacing: 0.5px;
                }

                table tbody tr:nth-child(even) {
                    background: #f8fafc;
                }

                table tbody tr:hover {
                    background: #edf2f7;
                }

                .page-break {
                    page-break-before: always;
                }

                .toc {
                    background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 30px;
                    margin: 30px 0;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }

                .toc h2 {
                    margin-top: 0;
                    border-bottom: none;
                    color: #1a365d;
                    font-size: 1.8em;
                }

                .toc ul {
                    list-style-type: none;
                    padding-left: 0;
                }

                .toc li {
                    margin: 8px 0;
                    break-inside: avoid;
                }

                .toc a {
                    text-decoration: none;
                    color: #3182ce;
                    font-weight: 500;
                    transition: color 0.2s ease;
                }

                .toc a:hover {
                    color: #2c5282;
                }

                .cover-page {
                    text-align: center;
                    padding: 120px 40px;
                    display: flex;
                    flex-direction: column;
                    justify-content: start;
                    align-items: center;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    position: relative;
                    page-break-after: always;
                }

                .cover-page::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.05"/><circle cx="10" cy="50" r="0.5" fill="white" opacity="0.05"/><circle cx="90" cy="30" r="0.5" fill="white" opacity="0.05"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
                    pointer-events: none;
                }

                .cover-logo {
                    width: 120px;
                    height: 120px;
                    margin-bottom: 30px;
                    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
                }

                .cover-org {
                    font-size: 1.2em;
                    color: rgba(255,255,255,0.9);
                    margin-bottom: 20px;
                    font-weight: 400;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                }

                .cover-title {
                    font-size: 3.5em;
                    font-weight: 700;
                    margin-bottom: 15px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    letter-spacing: -0.02em;
                }

                .cover-subtitle {
                    font-size: 1.4em;
                    color: rgba(255,255,255,0.9);
                    margin-bottom: 40px;
                    font-weight: 300;
                    max-width: 600px;
                    line-height: 1.4;
                }

                .cover-features {
                    display: flex;
                    gap: 30px;
                    margin-bottom: 40px;
                    flex-wrap: wrap;
                    justify-content: center;
                }

                .cover-feature {
                    background: rgba(255,255,255,0.1);
                    padding: 15px 20px;
                    border-radius: 25px;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.2);
                    font-size: 0.9em;
                    font-weight: 500;
                }

                .cover-info {
                    font-size: 1em;
                    color: rgba(255,255,255,0.8);
                    line-height: 1.8;
                    font-weight: 300;
                }

                @media print {
                    body {
                        margin: 0;
                        padding: 20px;
                        background: white !important;
                        box-shadow: none !important;
                    }

                    h1 {
                        page-break-before: always;
                        color: #1a365d !important;
                    }

                    h1:first-child {
                        page-break-before: auto;
                    }

                    pre {
                        page-break-inside: avoid;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
                    }

                    table {
                        page-break-inside: avoid;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
                    }

                    .cover-page {
                        background: #667eea !important;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
        `;
        
        // Add cover page
        htmlContent += `
        <div class="cover-page">
            <div class="cover-title">IU2U Protocol</div>
            <div class="cover-subtitle">Complete Cross-Chain & Gasless Solution<br>Technical Documentation</div>
            <div class="cover-features">
                <div class="cover-feature">Gasless Meta Transactions</div>
                <div class="cover-feature">IU2U Cross-Chain Bridge</div>
                <div class="cover-feature">DEX Aggregation (37+ Protocols)</div>
            </div>            
            <div class="cover-info">
                Version 1.0 | ${new Date().toLocaleDateString()}<br>
            </div>
            <img src="docs/logo.png" alt="DI Networks Logo" class="cover-logo" onerror="this.style.display='none'">
            <div class="cover-org">DI Networks</div>
        </div>
        `;
        
        // Generate table of contents
        htmlContent += `
        <div class="toc">
            <h2>Table of Contents</h2>
            <ul>
                <li><a href="#iu2u-protocol-overview">IU2U Protocol Overview</a></li>
                <li><a href="#protocol-architecture">Protocol Architecture</a></li>
                <li><a href="#iu2u-token">IU2U Token</a></li>
                <li><a href="#gasless-meta-transactions">Gasless Meta Transactions</a></li>
                <li><a href="#cross-chain-bridge">Cross-Chain Bridge</a></li>
                <li><a href="#dex-aggregation">DEX Aggregation</a></li>
                <li><a href="#metatx-gateway">MetaTx Gateway</a></li>
                <li><a href="#gas-credit-vault">Gas Credit Vault</a></li>
                <li><a href="#token-transfers">Token Transfers</a></li>
                <li><a href="#supported-dex-protocols">Supported DEX Protocols</a></li>
                <li><a href="#relayer-network">Relayer Network</a></li>
                <li><a href="#security-model">Security Model</a></li>
                <li><a href="#api-reference">API Reference</a></li>
                <li><a href="#quick-start-guide">Quick Start Guide</a></li>
                <li><a href="#installation">Installation</a></li>
                <li><a href="#integration-guide">Integration Guide</a></li>
            </ul>
        </div>
        `;
        
        // Process each markdown file
        const sectionTitles = [
            // Core Overview
            'IU2U Protocol Overview',
            'Protocol Architecture',
            'IU2U Token',

            // System Components
            'Gasless Meta Transactions',
            'Cross-Chain Bridge',
            'DEX Aggregation',

            // Key Features
            'MetaTx Gateway',
            'Gas Credit Vault',
            'Token Transfers',
            'Supported DEX Protocols',

            // Technical Details
            'Relayer Network',
            'Security Model',
            'API Reference',

            // Getting Started
            'Quick Start Guide',
            'Installation',
            'Integration Guide'
        ];
        
        for (let i = 0; i < files.length; i++) {
            const filePath = path.join(docsPath, files[i]);
            if (fs.existsSync(filePath)) {
                console.log(`Processing ${files[i]}...`);
                
                let markdown = fs.readFileSync(filePath, 'utf8');
                
                // Add section title and page break
                htmlContent += `<div class="page-break"></div>`;
                htmlContent += `<h1 id="${sectionTitles[i].toLowerCase().replace(/\s+/g, '-')}">${sectionTitles[i]}</h1>`;
                
                // Remove the first h1 from markdown since we're adding our own
                markdown = markdown.replace(/^#\s+.*$/m, '');
                
                // Convert markdown to HTML
                const html = marked.parse(markdown);
                htmlContent += html;
            }
        }
        
        htmlContent += `
        </body>
        </html>
        `;
        
        // Launch Puppeteer and generate PDF
        console.log('Launching browser...');
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Save HTML content to file
        console.log('Saving HTML content...');
        fs.writeFileSync('IU2U-Technical-Documentation.html', htmlContent);
        console.log('✅ HTML saved: IU2U-Technical-Documentation.html');

        // Set content with increased timeout
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0',
            timeout: 120000 // 2 minutes
        });
        
        console.log('Generating PDF...');
        
        // Generate PDF with increased timeout
        await page.pdf({
            path: 'IU2U-Technical-Documentation.pdf',
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            },
            displayHeaderFooter: true,
            headerTemplate: `
                <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
                    IU2U Technical Documentation - DI Networks
                </div>
            `,
            footerTemplate: `
                <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
                    <span class="pageNumber"></span> / <span class="totalPages"></span>
                </div>
            `,
            timeout: 180000 // 3 minutes
        });
        
        await browser.close();
        
        console.log('✅ PDF generated successfully: IU2U-Technical-Documentation.pdf');
        
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    generatePDF();
}

module.exports = { generatePDF };
