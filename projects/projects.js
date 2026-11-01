import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let projects = await fetchJSON('../lib/projects.json');

let projectsContainer = document.querySelector('.projects');
let searchInput = document.querySelector('.searchBar');

let query = '';
let selectedYear = null;

let arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

let sliceGenerator = d3.pie()
    .value((d) => d.value)
    .sort(null);

let years = [...new Set(projects.map((d) => String(d.year)))].sort();

let colors = d3.scaleOrdinal()
    .domain(years)
    .range(d3.schemeTableau10);

function renderPieChart(projectsGiven) {

    let rolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => String(d.year)
    );

    let data = rolledData.map(([year, count]) => {
        return { value: count, label: year };
    });

    let arcData = sliceGenerator(data);

    let arcs = arcData.map((d) => arcGenerator(d));

    let svg = d3.select('#projects-pie-plot');
    svg.selectAll('path').remove();

    arcs.forEach((arc, idx) => {
        let year = data[idx].label;

        svg.append('path')
            .attr('d', arc)
            .attr('fill', colors(year))
            .classed('selected', selectedYear === year)
            .on('click', () => {
                selectYear(year);
            });
    });

    let legend = d3.select('.legend');
    legend.selectAll('li').remove();

    data.forEach((d) => {
        legend.append('li')
            .attr('style', `--color:${colors(d.label)}`)
            .attr('class', 'legend-item')
            .classed('selected', selectedYear === d.label)
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
            .on('click', () => {
                selectYear(d.label);
            });
    });
}

function selectYear(year) {

    selectedYear = selectedYear === year ? null : year;

    updateDisplay();
}

function updateDisplay() {

    let filteredProjects = projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query.toLowerCase());
    });

    renderPieChart(filteredProjects);

    if (selectedYear !== null) {
        filteredProjects = filteredProjects.filter((project) => {
            return String(project.year) === selectedYear;
        });
    }

    renderProjects(filteredProjects, projectsContainer, 'h2');
}

searchInput.addEventListener('input', (event) => {

    query = event.target.value;

    updateDisplay();
});

updateDisplay();
