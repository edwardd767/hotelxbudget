(() => {
  const extraRows = window.__hotelxExtraRevenueRows || (window.__hotelxExtraRevenueRows = []);

  const style = document.createElement('style');
  style.textContent = `
    .revenue-desc-label.inline-desc-editing {
      min-width: 150px;
      outline: 1px dashed #f28a10;
      outline-offset: 3px;
      background: #fffdf5;
      padding: 2px 4px;
      border-radius: 3px;
      display: inline-block;
    }
    .inline-added-revenue-row td { background: #fffaf1 !important; }
  `;
  document.head.appendChild(style);

  const fmt = value => typeof formatAmount === 'function'
    ? formatAmount(value)
    : (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

  const parse = value => typeof parseAmount === 'function'
    ? parseAmount(value)
    : Number(String(value || '').replace(/,/g, '').replace(/[^0-9.-]/g, '')) || 0;

  const isRevenueEditMode = () => {
    const btn = document.getElementById('editRevenueBtn');
    return !!btn && btn.textContent.trim().toLowerCase() === 'save';
  };

  const recalc = () => {
    if (typeof recalculateRevenueTotals === 'function') recalculateRevenueTotals();
  };

  function bindAmountCell(cell) {
    if (!isRevenueEditMode()) return;
    cell.contentEditable = 'true';
    cell.classList.add('editable');
    if (cell.dataset.inlineAmountPatch) return;
    cell.dataset.inlineAmountPatch = '1';

    cell.addEventListener('input', recalc);
    cell.addEventListener('blur', () => {
      cell.textContent = fmt(parse(cell.textContent));
      saveExtraRows();
      recalc();
    });
    cell.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        cell.blur();
      }
    });
    cell.addEventListener('paste', event => {
      event.preventDefault();
      const text = (event.clipboardData || window.clipboardData).getData('text');
      document.execCommand('insertText', false, text.replace(/[^0-9.,-]/g, ''));
    });
  }

  function selectText(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function editDescription(label, onSave) {
    if (!label) return;
    label.contentEditable = 'true';
    label.classList.add('inline-desc-editing');
    label.focus();
    selectText(label);

    const finish = () => {
      label.contentEditable = 'false';
      label.classList.remove('inline-desc-editing');
      if (!label.textContent.trim()) label.textContent = 'New Revenue';
      if (onSave) onSave(label.textContent.trim());
      saveExtraRows();
    };

    label.addEventListener('blur', finish, { once: true });
    label.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        label.blur();
      }
    }, { once: true });
  }

  function makeDescCell(text, rowRef) {
    const td = document.createElement('td');
    td.className = 'desc-cell';

    const wrap = document.createElement('div');
    wrap.className = 'revenue-desc-wrap';

    const label = document.createElement('span');
    label.className = 'revenue-desc-label';
    label.textContent = text || 'New Revenue';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'revenue-desc-edit';
    btn.textContent = 'Edit';
    btn.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      editDescription(label, value => { rowRef.description = value; });
    });

    wrap.append(label, btn);
    td.appendChild(wrap);
    return { td, label };
  }

  function saveExtraRows() {
    document.querySelectorAll('#revenueTable .inline-added-revenue-row').forEach((row, index) => {
      if (!extraRows[index]) return;
      const label = row.querySelector('.revenue-desc-label');
      extraRows[index].description = label && label.textContent.trim() ? label.textContent.trim() : 'New Revenue';
      extraRows[index].values = Array.from(row.querySelectorAll('.amount-cell')).map(cell => parse(cell.textContent));
    });
  }

  function renderExtraRows() {
    const table = document.getElementById('revenueTable');
    if (!table) return;

    table.querySelectorAll('.inline-added-revenue-row').forEach(row => row.remove());
    const totalRow = table.querySelector('.total-row');
    if (!totalRow) return;

    extraRows.forEach(rowData => {
      const tr = document.createElement('tr');
      tr.className = 'data-row inline-added-revenue-row';

      const desc = makeDescCell(rowData.description || 'New Revenue', rowData);
      tr.appendChild(desc.td);

      for (let i = 0; i < 12; i++) {
        const td = document.createElement('td');
        td.className = 'amount-cell';
        td.dataset.month = i;
        td.textContent = fmt((rowData.values || [])[i] || 0);
        tr.appendChild(td);
      }

      const total = document.createElement('td');
      total.className = 'total-amount row-total';
      total.textContent = fmt((rowData.values || []).reduce((sum, value) => sum + (Number(value) || 0), 0));
      tr.appendChild(total);
      totalRow.parentNode.insertBefore(tr, totalRow);

      if (isRevenueEditMode()) tr.querySelectorAll('.amount-cell').forEach(bindAmountCell);
    });

    recalc();
  }

  function addRevenueRowDirectly() {
    saveExtraRows();
    const newRow = { description: 'New Revenue', values: Array(12).fill(0) };
    extraRows.push(newRow);
    renderExtraRows();

    const lastRow = document.querySelector('#revenueTable .inline-added-revenue-row:last-of-type');
    if (!lastRow) return;
    const label = lastRow.querySelector('.revenue-desc-label');
    editDescription(label, value => { newRow.description = value; });
    lastRow.querySelectorAll('.amount-cell').forEach(bindAmountCell);
  }

  document.addEventListener('click', event => {
    const addBtn = event.target.closest('.revenue-add-row-btn');
    if (addBtn) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      addRevenueRowDirectly();
      return;
    }

    const editBtn = event.target.closest('.revenue-desc-edit');
    if (editBtn) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const label = editBtn.closest('.revenue-desc-wrap')?.querySelector('.revenue-desc-label');
      editDescription(label);
    }
  }, true);

  document.addEventListener('click', event => {
    if (event.target && event.target.id === 'editRevenueBtn') {
      setTimeout(() => {
        renderExtraRows();
        if (isRevenueEditMode()) {
          document.querySelectorAll('#revenueTable .amount-cell').forEach(bindAmountCell);
        }
      }, 0);
    }
  });

  const observer = new MutationObserver(() => {
    const table = document.getElementById('revenueTable');
    if (table && !table.dataset.inlineRowPatchRendered) {
      table.dataset.inlineRowPatchRendered = '1';
      renderExtraRows();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(renderExtraRows, 300);
})();