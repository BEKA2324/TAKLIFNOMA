import type * as Leaflet from 'leaflet';
import type { LocationSelection, PlaceResult } from '../../shared/types.ts';
import { element as $, query, errorMessage } from '../lib/dom.ts';
declare global {
  interface Window {
    L?: typeof Leaflet;
  }
}
export function setupMap(onSelect: (selection: LocationSelection | null) => void) {
  const details = query<HTMLDetailsElement>('.map-picker');
  let map: Leaflet.Map | undefined,
    marker: Leaflet.Marker | undefined,
    selection: LocationSelection | null = null;
  let street: Leaflet.TileLayer | undefined;
  let satellite: Leaflet.TileLayer | undefined;
  let accuracy: Leaflet.Circle | undefined;
  let mode: 'satellite' | 'street' = 'satellite';
  let tileErrors = 0;
  const toolbar = document.createElement('div');
  toolbar.className = 'map-view-toolbar';
  toolbar.innerHTML = `<div class="map-view-tabs" role="group" aria-label="Xarita ko‘rinishi"><button type="button" data-map-view="satellite" class="active" aria-pressed="true">◉ Sun’iy yo‘ldosh</button><button type="button" data-map-view="street" aria-pressed="false">▦ Ko‘chalar</button></div><button type="button" class="map-expand" aria-pressed="false" aria-label="Xaritani kattalashtirish">⤢</button>`;
  $('map').before(toolbar);
  const hint = document.createElement('p');
  hint.className = 'map-help';
  hint.textContent = 'Joyni belgilang · Aniqroq tanlash uchun yaqinlashtiring';
  $('map').after(hint);
  function changeView(next: 'satellite' | 'street') {
    mode = next;
    if (map && street && satellite) {
      map.removeLayer(next === 'satellite' ? street : satellite);
      (next === 'satellite' ? satellite : street).addTo(map);
    }
    toolbar.querySelectorAll<HTMLButtonElement>('[data-map-view]').forEach((button) => {
      const active = button.dataset.mapView === next;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('map').classList.toggle('satellite-view', next === 'satellite');
  }
  toolbar.querySelectorAll<HTMLButtonElement>('[data-map-view]').forEach((button) => {
    button.addEventListener('click', () => {
      tileErrors = 0;
      changeView(button.dataset.mapView as 'satellite' | 'street');
    });
  });
  const expand = query<HTMLButtonElement>('.map-expand', toolbar);
  expand.addEventListener('click', () => {
    const expanded = details.classList.toggle('map-expanded');
    expand.setAttribute('aria-pressed', String(expanded));
    expand.setAttribute(
      'aria-label',
      expanded ? 'Xaritani kichraytirish' : 'Xaritani kattalashtirish',
    );
    expand.textContent = expanded ? '⤡' : '⤢';
    requestAnimationFrame(() => map?.invalidateSize({ pan: false }));
  });
  function select(lat: number, lng: number, name = '') {
    if (accuracy && map) {
      map.removeLayer(accuracy);
      accuracy = undefined;
    }
    lng = ((((lng + 180) % 360) + 360) % 360) - 180;
    selection = { lat, lng, name };
    if (marker) marker.setLatLng([lat, lng]);
    else
      marker = window
        .L!.marker([lat, lng], {
          draggable: true,
          title: 'Uchrashuv joyi — surib o‘zgartiring',
          alt: 'Tanlangan uchrashuv joyi',
          icon: window.L!.divIcon({
            className: 'luma-map-pin',
            iconSize: [44, 54],
            iconAnchor: [22, 50],
            html: `<svg viewBox="0 0 44 54" aria-hidden="true"><defs><linearGradient id="pin-pink" x2="1" y2="1"><stop stop-color="#ffbedf"/><stop offset="1" stop-color="#a653a4"/></linearGradient></defs><path d="M22 50S4 32 4 21a18 18 0 1 1 36 0c0 11-18 29-18 29Z" fill="url(#pin-pink)" stroke="#fff0fa" stroke-width="2.5"/><path d="M22 30 12 21c-5-6 4-13 10-6 6-7 15 0 10 6Z" fill="#fff4fb"/></svg>`,
          }),
        })
        .addTo(map!)
        .bindTooltip('Uchrashuv shu yerda ♡', { direction: 'top', offset: [0, -45] })
        .on('dragend', () => {
          const point = marker!.getLatLng();
          select(point.lat, point.lng);
        });
    $('map-status').textContent =
      `Tanlandi: ${lat.toFixed(5)}, ${lng.toFixed(5)}. Belgini surib aniqlashtiring.`;
    onSelect(selection);
  }
  details.addEventListener('toggle', () => {
    if (!details.open) return;
    if (!window.L) {
      $('map-status').textContent =
        'Xarita yuklanmadi. Internetni tekshiring. Manzilni yuqoridagi maydonga yozishingiz mumkin.';
      return;
    }
    if (!map) {
      map = window
        .L!.map('map', { scrollWheelZoom: false, zoomControl: false })
        .setView([38, 54], 4);
      window
        .L!.control.zoom({
          position: 'bottomright',
          zoomInTitle: 'Yaqinlashtirish',
          zoomOutTitle: 'Uzoqlashtirish',
        })
        .addTo(map);
      window.L!.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
      street = window.L!.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      });
      satellite = window.L!.tileLayer(
        'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          maxNativeZoom: 18,
          attribution:
            'Imagery © <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9">Esri</a>, Maxar, Earthstar Geographics, GIS User Community',
        },
      );
      satellite.on('tileerror', () => {
        if (mode === 'satellite' && ++tileErrors >= 3) {
          changeView('street');
          $('map-status').textContent =
            'Sun’iy yo‘ldosh tasviri yuklanmadi. Ko‘chalar xaritasi ochildi.';
        }
      });
      changeView(mode);
      new ResizeObserver(() => map?.invalidateSize({ pan: false })).observe($('map'));
      map.on('click', (e) => select(e.latlng.lat, e.latlng.lng));
    }
    requestAnimationFrame(() => map?.invalidateSize());
  });
  async function search() {
    const q = $('map-query').value.trim();
    if (q.length < 3) {
      $('map-status').textContent = 'Kamida 3 ta harf kiriting.';
      return;
    }
    $('map-search').disabled = true;
    $('map-results').replaceChildren();
    $('map-status').textContent = 'Manzil qidirilmoqda…';
    try {
      const r = await fetch('/api/places?q=' + encodeURIComponent(q));
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      const places = data as PlaceResult[];
      if (!data.length)
        $('map-status').textContent = 'Topilmadi. Shahar yoki mamlakat nomini ham yozing.';
      else {
        $('map-status').textContent = 'Natijadan kerakli manzilni tanlang.';
        for (const place of places) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = place.name;
          button.addEventListener('click', () => {
            if (!map) {
              $('map-status').textContent = 'Xarita yuklanmagan. Internetni tekshiring.';
              return;
            }
            map.flyTo([place.lat, place.lng], 17, {
              duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1.2,
            });
            select(place.lat, place.lng, place.name.slice(0, 200));
            $('place').value = place.name.slice(0, 200);
            $('place').dispatchEvent(new Event('input'));
            $('map-results').replaceChildren();
          });
          $('map-results').append(button);
        }
      }
    } catch (e) {
      $('map-status').textContent = errorMessage(e);
    } finally {
      $('map-search').disabled = false;
    }
  }
  $('map-search').addEventListener('click', search);
  $('map-query').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      search();
    }
  });
  $('locate').addEventListener('click', () => {
    if (!map || !navigator.geolocation) {
      $('map-status').textContent = 'Joylashuvga kirish mavjud emas. Xaritadan tanlang.';
      return;
    }
    $('map-status').textContent = 'Joylashuvingiz aniqlanmoqda…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map!.setView([pos.coords.latitude, pos.coords.longitude], 17);
        select(pos.coords.latitude, pos.coords.longitude);
        accuracy = window
          .L!.circle([pos.coords.latitude, pos.coords.longitude], {
            radius: pos.coords.accuracy,
            color: '#d88ab9',
            fillColor: '#e6a1cf',
            fillOpacity: 0.12,
            weight: 1,
          })
          .addTo(map!);
      },
      () => {
        $('map-status').textContent =
          'Joylashuvga ruxsat berilmadi yoki aniqlanmadi. Xaritadan tanlang.';
      },
      { timeout: 12000, enableHighAccuracy: true },
    );
  });
  $('clear-location').addEventListener('click', () => {
    if (marker) {
      map!.removeLayer(marker);
      marker = undefined;
    }
    if (accuracy && map) {
      map.removeLayer(accuracy);
      accuracy = undefined;
    }
    selection = null;
    onSelect(null);
    $('map-status').textContent = 'Nuqta o‘chirildi. Manzil matni saqlandi.';
  });
}
