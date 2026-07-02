// Vehicles Screen logic matching VehiclesScreen.kt
let vehiclesListenersAttached = false;
function initVehiclesScreen() {
    renderVehiclesList();
    if (!vehiclesListenersAttached) {
        DataRepository.onChange('vehicles', renderVehiclesList);
        vehiclesListenersAttached = true;
    }
}

function renderVehiclesList() {
    const listEl = document.getElementById('vehicles-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    
    const vehicles = DataRepository.vehicles;
    
    if (vehicles.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-round empty-state-icon">directions_car</span>
                <h4 class="empty-state-title">No vehicles added yet</h4>
                <p class="empty-state-subtitle">Tap + to add a vehicle to the fleet</p>
            </div>
        `;
        return;
    }
    
    vehicles.forEach(vehicle => {
        const card = document.createElement('div');
        card.className = "item-card";
        card.style.marginBottom = "8px";
        
        card.innerHTML = `
            <div class="item-card-row">
                <div class="item-card-left">
                    <div class="avatar-circle" style="background-color: var(--outline-light);"><span class="material-icons-round">local_shipping</span></div>
                    <div class="item-card-meta">
                        <span class="item-card-title">${vehicle.number}</span>
                        <span class="item-card-subtitle">${vehicle.name}</span>
                    </div>
                </div>
                <div class="item-card-actions">
                    <button class="btn-icon-small btn-edit-vehicle" title="Edit">
                        <span class="material-icons-round" style="color: var(--primary)">edit</span>
                    </button>
                    <button class="btn-icon-small btn-delete-vehicle" title="Delete">
                        <span class="material-icons-round" style="color: var(--expense-red)">delete</span>
                    </button>
                </div>
            </div>
        `;
        
        card.querySelector('.btn-edit-vehicle').addEventListener('click', () => openVehicleForm(vehicle));
        card.querySelector('.btn-delete-vehicle').addEventListener('click', () => confirmDeleteVehicle(vehicle));
        
        listEl.appendChild(card);
    });
}

function openVehicleForm(vehicle = null) {
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    title.textContent = vehicle ? "Edit Vehicle Info" : "Add Vehicle to Fleet";
    
    body.innerHTML = `
        <form id="vehicle-dialog-form">
            <div class="input-group">
                <label for="form-vehicle-number">Vehicle Number *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">badge</span>
                    <input type="text" id="form-vehicle-number" placeholder="KL-10-AB-1234" required value="${vehicle ? vehicle.number : ''}">
                </div>
            </div>
            <div class="input-group">
                <label for="form-vehicle-name">Driver / Vehicle Name *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">person</span>
                    <input type="text" id="form-vehicle-name" placeholder="Driver Name" required value="${vehicle ? vehicle.name : ''}">
                </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Save Vehicle</button>
        </form>
    `;
    
    const form = document.getElementById('vehicle-dialog-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const number = document.getElementById('form-vehicle-number').value.trim();
        const name = document.getElementById('form-vehicle-name').value.trim();
        
        try {
            if (vehicle) {
                await DataRepository.updateVehicle({
                    id: vehicle.id,
                    number,
                    name
                });
            } else {
                await DataRepository.addVehicle({
                    number,
                    name
                });
            }
            closeModal();
        } catch (err) {
            alert(`Error saving vehicle: ${err.message}`);
        }
    });
    
    openModal();
}

function confirmDeleteVehicle(vehicle) {
    if (confirm(`Are you sure you want to delete vehicle ${vehicle.number}?`)) {
        DataRepository.deleteVehicle(vehicle.id)
            .catch(err => alert(`Error deleting vehicle: ${err.message}`));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const fabVehicles = document.getElementById('fab-add-vehicle');
    if (fabVehicles) fabVehicles.addEventListener('click', () => openVehicleForm());
});
