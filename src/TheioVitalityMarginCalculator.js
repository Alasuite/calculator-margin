import React, { useState, useEffect } from 'react';
import { Plus, Minus, DollarSign, TrendingUp, BarChart, Download } from 'lucide-react';
import { select } from 'd3-selection';
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import * as XLSX from 'xlsx';
import './index.css';

const CURRENCIES = {
  USD: { name: 'US Dollar', symbol: '$' },
  CAD: { name: 'Canadian Dollar', symbol: 'CA$' },
  EUR: { name: 'Euro', symbol: '€' },
  JPY: { name: 'Japanese Yen', symbol: '¥' },
  KRW: { name: 'South Korean Won', symbol: '₩' },
};

const PRODUCT_CATEGORIES = [
  'Hair kit', 'Analysis option', 'Nutrition coaching', 'Natural Cosmetics', 'Wellness Services'
];

const CurrencySelector = ({ value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="border rounded px-2 py-1"
  >
    {Object.keys(CURRENCIES).map((currency) => (
      <option key={currency} value={currency}>{CURRENCIES[currency].name}</option>
    ))}
  </select>
);

const StageRow = ({ stage, index, onInputChange, onRemove, baseCurrency }) => (
  <tr className="border-b">
    <td className="custom-table-cell">
      <input
        type="text"
        value={stage.name}
        onChange={(e) => onInputChange(index, 'name', e.target.value)}
        className="w-full border rounded px-2 py-1"
      />
    </td>
    <td className="custom-table-cell">
      {category}
    </td>
    <td className="custom-table-cell">
      <div className="flex items-center">
        <span className="mr-1">{CURRENCIES[baseCurrency].symbol}</span>
        <input
          type="text"
          value={stage.cost === 0 ? '' : stage.cost}
          onChange={(e) => onInputChange(index, 'cost', e.target.value)}
          className="w-full border rounded px-2 py-1"
        />
      </div>
    </td>
    <td className="custom-table-cell">
      <div className="flex items-center">
        <span className="mr-1">{CURRENCIES[baseCurrency].symbol}</span>
        <input
          type="text"
          value={stage.price === 0 ? '' : stage.price}
          onChange={(e) => onInputChange(index, 'price', e.target.value)}
          className="w-full border rounded px-2 py-1"
        />
      </div>
    </td>
    <td className="custom-table-cell">
      <div className="flex items-center">
        <span className="mr-1">{CURRENCIES[baseCurrency].symbol}</span>
        <input
          type="text"
          value={stage.margin === 0 ? '' : stage.margin}
          onChange={(e) => onInputChange(index, 'margin', e.target.value)}
          className="w-full border rounded px-2 py-1"
        />
      </div>
    </td>
    <td className="custom-table-cell">
      {stage.cost ? ((stage.margin / stage.cost) * 100).toFixed(2) : '0.00'}%
    </td>
    <td className="custom-table-cell">
      {index > 0 && (
        <button
          onClick={() => onRemove(index)}
          className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
        >
          <Minus size={16} />
        </button>
      )}
    </td>
  </tr>
);

const CurrencyConversionRow = ({ stage, baseCurrency, exchangeRates }) => (
  <tr className="border-b">
    <td className="custom-table-cell">{stage.name}</td>
    {Object.keys(CURRENCIES).map((currency) => (
      <td key={currency} className="custom-table-cell">
        {CURRENCIES[currency].symbol}
        {((stage.price / exchangeRates[baseCurrency]) * exchangeRates[currency]).toFixed(2)}
      </td>
    ))}
  </tr>
);

const TheioVitalityMarginCalculator = () => {
  const [stages, setStages] = useState([
    { name: 'Raw Materials', cost: 100, price: 120, margin: 20 },
    { name: 'Manufacturing', cost: 120, price: 150, margin: 30 },
    { name: 'Distribution', cost: 150, price: 200, margin: 50 },
  ]);
  const [category, setCategory] = useState('Hair kit');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState({
    USD: 1, CAD: 1.30, EUR: 0.90, JPY: 140, KRW: 1300,
  });

  useEffect(() => {
    setExchangeRates({
      USD: 1, CAD: 1.30, EUR: 0.90, JPY: 140, KRW: 1300,
    });
  }, []);

  const handleInputChange = (index, field, value) => {
    const newStages = [...stages];
    if (field === 'name' || field === 'category') {
      newStages[index][field] = value;
    } else {
      const numValue = value === '' ? 0 : parseFloat(value) || 0;
      newStages[index][field] = numValue;

      if (field === 'cost' || field === 'price') {
        newStages[index].margin = newStages[index].price - newStages[index].cost;
      } else if (field === 'margin') {
        newStages[index].price = newStages[index].cost + numValue;
      }
    }

    // Update subsequent stages
    for (let i = index + 1; i < newStages.length; i++) {
      newStages[i].cost = newStages[i - 1].price;
      newStages[i].margin = newStages[i].price - newStages[i].cost;
    }

    setStages(newStages);
  };

  const addStage = () => {
    const lastStage = stages[stages.length - 1];
    const newStage = {
      name: `Stage ${stages.length + 1}`,
      cost: lastStage.price,
      price: lastStage.price * 1.2,
      margin: lastStage.price * 0.2,
    };
    setStages([...stages, newStage]);
  };

  const removeStage = (index) => {
    if (stages.length > 2) {
      const newStages = [...stages];
      newStages.splice(index, 1);
      setStages(newStages);
    }
  };

  const totalMargin = stages.reduce((sum, stage) => sum + stage.margin, 0);
  const finalPrice = stages[stages.length - 1].price;
  const initialCost = stages[0].cost;
  const markup = ((finalPrice / initialCost) - 1) * 100;
  const profitMargin = (totalMargin / finalPrice) * 100;
  const roi = (totalMargin / initialCost) * 100;
  const breakEvenUnits = initialCost / (finalPrice - totalMargin);

  useEffect(() => {
    const svg = select('#sankey');
    svg.selectAll('*').remove();

    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;

    const sankeyGenerator = sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .size([width, height])
      .nodeAlign(sankeyJustify);

    const graph = {
      nodes: stages.map((stage, i) => ({ node: i, name: stage.name })),
      links: stages.slice(1).map((stage, i) => ({
        source: i,
        target: i + 1,
        value: stages[i + 1].cost
      }))
    };

    const { nodes, links } = sankeyGenerator(graph);

    svg.append('g')
      .selectAll('rect')
      .data(nodes)
      .enter()
      .append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', 'steelblue')
      .attr('stroke', '#000');

    svg.append('g')
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', 'grey')
      .attr('stroke-width', d => d.width)
      .attr('fill', 'none');
  }, [stages]);

  useEffect(() => {
    const map = L.map('map').setView([20, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    stages.forEach(stage => {
      L.marker([Math.random() * 170 - 85, Math.random() * 360 - 180])
        .addTo(map)
        .bindPopup(`<b>${stage.name}</b><br>${CURRENCIES[baseCurrency].symbol}${stage.price}`);
    });

    return () => {
      map.remove();
    };
  }, [stages]);

  const exportToExcel = () => {
    const exportStages = stages.map(stage => ({
      ...stage,
      category
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportStages);
    XLSX.utils.book_append_sheet(wb, ws, "Stages");

    const summaryData = [
      { Metric: "Total Margin", Value: totalMargin },
      { Metric: "Final Price", Value: finalPrice },
      { Metric: "Markup", Value: markup },
      { Metric: "Profit Margin", Value: profitMargin },
      { Metric: "ROI", Value: roi },
      { Metric: "Break-even Units", Value: breakEvenUnits },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    XLSX.writeFile(wb, "TheioVitalityMarginCalculator.xlsx");
  };

  return (
    <div className="custom-section">
      <h1 className="custom-header">Theio Vitality Margin Calculator</h1>
      
      <div className="flex justify-between mb-4">
        <div>
          <DollarSign className="mr-2" />
          <label className="mr-2 font-semibold">Base Currency:</label>
          <CurrencySelector value={baseCurrency} onChange={setBaseCurrency} />
        </div>
        
        <div>
          <label className="mr-2 font-semibold">Category:</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border rounded px-2 py-1"
          >
            {PRODUCT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        
        <div>
          <button
            onClick={exportToExcel}
            className="custom-button"
          >
            <Download size={16} className="mr-2" />
            Export to Excel
          </button>
        </div>
      </div>

      <div className="custom-table mb-4">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="custom-table-header">
              <th className="custom-table-cell">Stage</th>
              <th className="custom-table-cell">Category</th>
              <th className="custom-table-cell">Cost</th>
              <th className="custom-table-cell">Price</th>
              <th className="custom-table-cell">Margin</th>
              <th className="custom-table-cell">Margin %</th>
              <th className="custom-table-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage, index) => (
              <StageRow
                key={index}
                stage={stage}
                index={index}
                onInputChange={handleInputChange}
                onRemove={removeStage}
                baseCurrency={baseCurrency}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-start mb-4">
        <button
          onClick={addStage}
          className="custom-button"
        >
          <Plus size={16} className="mr-2" />
          Add Stage
        </button>
      </div>

      <div className="custom-stats">
        <div>
          <p className="custom-metrics flex items-center relative group">
            <TrendingUp className="custom-metrics-icon text-blue-500" />
            Markup:
            <span className="ml-2 text-blue-600">{markup.toFixed(2)}%</span>
            <div className="absolute bottom-0 left-0 mb-6 hidden group-hover:block w-64 bg-black text-white text-sm p-2 rounded opacity-75">
              Markup is the percentage difference between the cost of a product and its selling price.
            </div>
          </p>
          <p className="custom-metrics flex items-center relative group">
            <BarChart className="custom-metrics-icon text-purple-500" />
            Profit Margin:
            <span className="ml-2 text-purple-600">{profitMargin.toFixed(2)}%</span>
            <div className="absolute bottom-0 left-0 mb-6 hidden group-hover:block w-64 bg-black text-white text-sm p-2 rounded opacity-75">
              Profit Margin is the percentage of profit earned from sales.
            </div>
          </p>
          <p className="custom-metrics flex items-center relative group">
            ROI:
            <span className="ml-2 text-green-600">{roi.toFixed(2)}%</span>
            <div className="absolute bottom-0 left-0 mb-6 hidden group-hover:block w-64 bg-black text-white text-sm p-2 rounded opacity-75">
              ROI (Return on Investment) measures the gain or loss generated relative to the investment.
            </div>
          </p>
          <p className="custom-metrics flex items-center relative group">
            Break-even Units:
            <span className="ml-2 text-orange-600">{breakEvenUnits.toFixed(2)}</span>
            <div className="absolute bottom-0 left-0 mb-6 hidden group-hover:block w-64 bg-black text-white text-sm p-2 rounded opacity-75">
              Break-even Units is the number of units that must be sold to cover the cost.
            </div>
          </p>
        </div>
      </div>

      <div className="custom-chart mt-8">
        <h2 className="text-xl font-bold mb-4">Chain Margin Visualization</h2>
        <svg id="sankey" width="100%" height="100%"></svg>
      </div>

      <div className="custom-chart mt-8">
        <h2 className="text-xl font-bold mb-4">Geographical Price Visualization</h2>
        <div id="map" className="h-96"></div>
      </div>

      <h2 className="text-2xl font-bold mt-8 mb-4">Currency Conversion Table</h2>
      <div className="custom-currency-table">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="custom-table-header">
              <th className="custom-table-cell">Stage</th>
              {Object.keys(CURRENCIES).map((currency) => (
                <th key={currency} className="custom-table-cell">{CURRENCIES[currency].name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stages.map((stage, index) => (
              <CurrencyConversionRow
                key={index}
                stage={stage}
                baseCurrency={baseCurrency}
                exchangeRates={exchangeRates}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TheioVitalityMarginCalculator;
