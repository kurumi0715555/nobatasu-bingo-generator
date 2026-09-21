(function() {
    'use strict';

    // Elements
    const wordListTextarea = document.getElementById('wordList');
    const gridSizeSelect = document.getElementById('gridSize');
    const useFreeSquareCheckbox = document.getElementById('useFreeSquare');
    const freeSquareOptionDiv = document.getElementById('freeSquareOption');
    const generateBtn = document.getElementById('generateBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const printBtn = document.getElementById('printBtn');
    const saveImgBtn = document.getElementById('saveImgBtn');
    const savePdfBtn = document.getElementById('savePdfBtn');
    const bingoWrapper = document.getElementById('bingoWrapper');
    const bingoGrid = document.getElementById('bingoGrid');
    const sheetCountInput = document.getElementById('sheetCount');
    const loadingModal = document.getElementById('loadingModal');
    const loadingText = document.getElementById('loadingText');

    // State
    let currentWords = [];

    // Initialize
    function init() {
        // Event Listeners
        generateBtn.addEventListener('click', handleGenerate);
        shuffleBtn.addEventListener('click', handleShuffle);
        printBtn.addEventListener('click', () => window.print());
        saveImgBtn.addEventListener('click', handleSaveImg);
        savePdfBtn.addEventListener('click', handleSavePdf);
        gridSizeSelect.addEventListener('change', handleGridSizeChange);

        // Initial check for Free square visibility
        handleGridSizeChange();
    }

    function handleGridSizeChange() {
        const size = parseInt(gridSizeSelect.value);
        if (size === 5) {
            freeSquareOptionDiv.style.display = 'block';
        } else {
            freeSquareOptionDiv.style.display = 'none';
        }
    }

    function handleGenerate() {
        const text = wordListTextarea.value;
        const rawLines = text.split(/\r\n|\r|\n/);
        // Convert numbers to full-width and trim
        const words = rawLines.map(line => {
            let val = line.trim();
            // Convert any half-width numbers to full-width
            val = val.replace(/[0-9]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0));
            return val;
        }).filter(line => line !== '');

        const size = parseInt(gridSizeSelect.value);
        const totalCells = size * size;
        const useFree = (size === 5 && useFreeSquareCheckbox.checked);
        const requiredWords = useFree ? totalCells - 1 : totalCells;

        if (words.length < requiredWords) {
            const toFullWidth = (str) => str.toString().replace(/[0-9]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0));
            Modal.alert(`単語が足りません。\n現在の設定（${toFullWidth(size)}x${toFullWidth(size)}${useFree ? ' + FREE' : ''}）では、最低 ${toFullWidth(requiredWords)} 個の単語が必要です。\n現在の単語数: ${toFullWidth(words.length)}`);
            return;
        }

        currentWords = words;
        
        // UI updates
        bingoWrapper.style.display = 'block';
        const outputSection = document.getElementById('outputSection');
        if (outputSection) outputSection.style.display = 'block';
        
        // Apply Grid Class
        bingoGrid.className = 'bingo-grid'; // Reset
        bingoGrid.classList.add(`grid-${size}`);

        renderBingo(currentWords, size, useFree);
        
        // Scroll to bingo card
        bingoWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function handleShuffle() {
        const size = parseInt(gridSizeSelect.value);
        const useFree = (size === 5 && useFreeSquareCheckbox.checked);
        renderBingo(currentWords, size, useFree);
    }

    async function handleSaveImg() {
        if (!bingoGrid) return;
        try {
            document.body.classList.add('export-mode');

            const canvas = await html2canvas(bingoGrid, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true
            });

            document.body.classList.remove('export-mode');

            const link = document.createElement('a');
            link.download = 'bingo-card.jpg';
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
        } catch (err) {
            console.error('Image save failed:', err);
            Modal.alert('画像の保存に失敗しました。');
            document.body.classList.remove('export-mode');
        }
    }

    async function handleSavePdf() {
        if (!bingoGrid) return;
        
        const count = parseInt(sheetCountInput.value) || 1;
        
        if (count > 1) {
            await handleBulkSavePdf(count);
            return;
        }

        // Single PDF Logic (Original)
        try {
            document.body.classList.add('export-mode');

            const canvas = await html2canvas(bingoGrid, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true
            });
            
            document.body.classList.remove('export-mode');

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const { jsPDF } = window.jspdf;
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            const imgWidth = pageWidth - 40; 
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            const x = 20;
            const y = 40;

            pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
            pdf.save('bingo-card.pdf');

        } catch (err) {
            console.error('PDF save failed:', err);
            Modal.alert('PDFの保存に失敗しました。');
            document.body.classList.remove('export-mode');
        }
    }

    async function handleBulkSavePdf(count) {
        try {
            loadingModal.style.display = 'flex';
            document.body.classList.add('export-mode');
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            
            // Backup current words to restore later if needed (optional)
            // Actually we just reshuffle currentWords. 
            // We should ensure we don't lose the original active states if we want to be nice, 
            // but for a generator, resetting is fine.
            
            for (let i = 0; i < count; i++) {
                loadingText.textContent = `作成中... (${i + 1}/${count})`;
                
                // Shuffle and Render
                handleShuffle();
                
                // Small delay to allow DOM update and UI render
                await new Promise(resolve => setTimeout(resolve, 50));
                
                const canvas = await html2canvas(bingoGrid, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    useCORS: true
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                
                if (i > 0) {
                    pdf.addPage();
                }
                
                const imgWidth = pageWidth - 40; 
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const x = 20;
                const y = 40;
                
                pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
            }

            pdf.save(`bingo-cards-${count}sheets.pdf`);

        } catch (err) {
            console.error('Bulk PDF save failed:', err);
            Modal.alert('一括PDF保存に失敗しました。');
        } finally {
            document.body.classList.remove('export-mode');
            loadingModal.style.display = 'none';
        }
    }

    function renderBingo(words, size, useFree) {
        // Clear grid
        bingoGrid.innerHTML = '';

        // Prepare words for grid
        // Shuffle a copy of the words array
        let shuffled = shuffleArray([...words]);
        let gridWords = [];

        const totalCells = size * size;
        
        // If we have more words than needed, just take the first N necessary
        // However, standard bingo usually just picks random subset if list is long
        // But the requirement says "Input words -> Shuffle -> Create". 
        // We will take the first N from the shuffled full list.
        
        let wordIndex = 0;
        for (let i = 0; i < totalCells; i++) {
            // Check for FREE space in 5x5 center (index 12)
            if (useFree && i === 12) {
                gridWords.push({ text: 'FREE', isFree: true });
            } else {
                // If we run out of words (shouldn't happen due to validation, but safe check)
                // We wrap around or show empty? Validation ensures we have enough.
                if (wordIndex < shuffled.length) {
                    gridWords.push({ text: shuffled[wordIndex], isFree: false });
                    wordIndex++;
                } else {
                    // Fallback for safety, though validation prevents this
                    gridWords.push({ text: '', isFree: false });
                }
            }
        }

        // Render cells
        gridWords.forEach(item => {
            const cell = document.createElement('div');
            cell.className = 'bingo-cell';
            if (item.isFree) {
                cell.classList.add('free');
                cell.classList.add('active'); // Free is usually pre-marked or special
            }

            const content = document.createElement('div');
            content.className = 'bingo-cell-content';
            content.textContent = item.text;
            
            // Adjust font size
            const len = item.text.length;
            if (len <= 2) {
                content.style.fontSize = '2.5rem';
            } else if (len <= 4) {
                content.style.fontSize = '2rem';
            } else if (len <= 6) {
                content.style.fontSize = '1.5rem';
            } else if (len <= 10) {
                content.style.fontSize = '1.2rem';
            } else {
                content.style.fontSize = '1rem';
            }

            cell.appendChild(content);

            // Click event
            cell.addEventListener('click', () => {
                // Don't toggle FREE if it's permanent, or do we? 
                // Usually FREE is free. Let's allow toggling off if they want, 
                // but default behavior is it counts.
                // Requirement: "Click to change color".
                cell.classList.toggle('active');
            });

            bingoGrid.appendChild(cell);
        });
    }

    // Fisher-Yates Shuffle
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Run init
    init();
})();
